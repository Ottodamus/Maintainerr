import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collection } from '../collections/entities/collection.entities';
import { CollectionMedia } from '../collections/entities/collection_media.entities';
import { MaintainerrLogger } from '../logging/logs.service';
import { PlexMapper } from '../api/media-server/plex/plex.mapper';
import { PlexMirrorCollectionLink } from './entities/plex-mirror-collection-link.entities';
import { PlexMirrorSite } from './entities/plex-mirror-site.entities';
import { createPlexMirrorClient, PlexMirrorClient } from './plex-mirror-client';
import {
  buildProviderIdIndex,
  ProviderIdIndex,
  resolveByProviderIds,
} from './plex-mirror-matching.util';

/**
 * Pushes each visible, movie/show-level Collection's current membership onto
 * every configured mirror site as a local Plex collection ("Leaving Soon"),
 * matching titles by imdb/tmdb/tvdb id against a fresh index of that site's
 * own library - Plex exposes no server-side "find by external id" lookup, so
 * the index has to be built client-side each run (see buildProviderIdIndex).
 *
 * Season/episode-level collections are skipped: matching a specific season or
 * episode would need a second resolution step within the matched show on the
 * mirror site, which is real added complexity deferred to a follow-up - most
 * deletion collections are movie/show-level anyway.
 *
 * Purely reconciliation-driven (no event subscription to CollectionMedia_Added
 * etc.): a mirror site only ever needs to be *eventually* consistent, since
 * Syncthing's own replication lag already means "instant" reflection isn't
 * achievable, and reconciliation-only is materially simpler.
 */
@Injectable()
export class PlexMirrorSyncService {
  constructor(
    @InjectRepository(PlexMirrorCollectionLink)
    private readonly linkRepo: Repository<PlexMirrorCollectionLink>,
    @InjectRepository(Collection)
    private readonly collectionRepo: Repository<Collection>,
    @InjectRepository(CollectionMedia)
    private readonly collectionMediaRepo: Repository<CollectionMedia>,
    private readonly logger: MaintainerrLogger,
  ) {
    this.logger.setContext(PlexMirrorSyncService.name);
  }

  public async syncSite(site: PlexMirrorSite): Promise<void> {
    const client = createPlexMirrorClient(site);

    const machineId = await client.getMachineId();
    if (!machineId) {
      throw new Error(
        `Could not resolve a machine id for mirror site '${site.siteName}' - is it reachable?`,
      );
    }

    const libraryItems = await client.getLibraryItems(site.librarySectionId);
    const index = buildProviderIdIndex(libraryItems, (item) => item.ratingKey);

    const collections = await this.collectionRepo.find({
      where: [{ visibleOnHome: true }, { visibleOnRecommended: true }],
    });

    for (const collection of collections) {
      if (collection.type !== 'movie' && collection.type !== 'show') {
        continue;
      }

      try {
        await this.syncCollection(client, machineId, site, collection, index);
      } catch (error) {
        this.logger.warn(
          `Failed to sync collection '${collection.title}' to mirror site '${site.siteName}'`,
        );
        this.logger.debug(error);
      }
    }
  }

  private async syncCollection(
    client: PlexMirrorClient,
    machineId: string,
    site: PlexMirrorSite,
    collection: Collection,
    index: ProviderIdIndex<string>,
  ): Promise<void> {
    const media = await this.collectionMediaRepo.find({
      where: { collectionId: collection.id },
    });

    const matchedRatingKeys = media
      .map((item) => resolveByProviderIds(item, index))
      .filter((ratingKey): ratingKey is string => ratingKey != null);

    const existingLink = await this.linkRepo.findOne({
      where: { plexMirrorSiteId: site.id, collectionId: collection.id },
    });

    if (matchedRatingKeys.length === 0) {
      if (existingLink?.mirrorRatingKey) {
        await client.deleteCollection(existingLink.mirrorRatingKey);
        await this.linkRepo.update(
          { id: existingLink.id },
          { mirrorRatingKey: null },
        );
      }
      return;
    }

    const link =
      existingLink ??
      (await this.linkRepo.save({
        plexMirrorSiteId: site.id,
        collectionId: collection.id,
        mirrorRatingKey: null,
      }));

    let mirrorRatingKey = link.mirrorRatingKey;

    if (!mirrorRatingKey) {
      const created = await client.createCollection(
        site.librarySectionId,
        PlexMapper.toPlexDataType(collection.type),
        collection.title,
      );

      if (!created) {
        this.logger.warn(
          `Could not create mirror collection '${collection.title}' on site '${site.siteName}'`,
        );
        return;
      }

      mirrorRatingKey = created.ratingKey;
      await this.linkRepo.update({ id: link.id }, { mirrorRatingKey });
    }

    const currentChildren = await client.getCollectionChildren(mirrorRatingKey);
    const currentRatingKeys = new Set(
      currentChildren.map((child) => child.ratingKey),
    );
    const matchedSet = new Set(matchedRatingKeys);

    const toAdd = matchedRatingKeys.filter(
      (ratingKey) => !currentRatingKeys.has(ratingKey),
    );
    const toRemove = [...currentRatingKeys].filter(
      (ratingKey) => !matchedSet.has(ratingKey),
    );

    if (toAdd.length > 0) {
      await client.addItemsToCollection(mirrorRatingKey, toAdd, machineId);
    }

    if (toRemove.length > 0) {
      for (const ratingKey of toRemove) {
        await client.removeItemFromCollection(mirrorRatingKey, ratingKey);
      }

      // An item leaving the matched set means it's gone from the primary
      // collection - most likely deleted, so the underlying file on this
      // site's Syncthing-replicated storage is presumably gone too. Ask Plex
      // to notice, scoped to just this library section.
      await client.refreshLibrary(site.librarySectionId);
      await client.emptyTrash(site.librarySectionId);
    }
  }
}
