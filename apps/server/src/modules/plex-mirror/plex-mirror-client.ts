import { EPlexDataType } from '@maintainerr/contracts';
import PlexApi from '../api/lib/plexApi';
import { PlexCollection } from '../api/plex-api/interfaces/collection.interface';
import {
  PlexLibraryItem,
  PlexLibraryResponse,
} from '../api/plex-api/interfaces/library.interfaces';
import { PLEX_REQUEST_TIMEOUT_MS } from '../api/plex-api/plex-api.constants';
import { PlexStatusResponse } from '../api/plex-api/interfaces/server.interface';
import { PlexMirrorSite } from './entities/plex-mirror-site.entities';
import { parsePlexUrl } from './plex-mirror-site.service';

/**
 * Talks directly to one mirror site's Plex server via a standalone PlexApi
 * instance - deliberately independent of PlexApiService/MediaServerFactory,
 * which stay wired to the primary server only. Every endpoint here is copied
 * from this codebase's own already-correct PlexApiService implementation
 * (create/add/remove/delete collection) or, for emptyTrash/refresh (which
 * PlexApiService has no precedent for), verified directly against
 * python-plexapi's LibrarySection source (emptyTrash -> PUT
 * /library/sections/{id}/emptyTrash, update -> GET
 * /library/sections/{id}/refresh).
 */
export class PlexMirrorClient {
  constructor(private readonly plexApi: PlexApi) {}

  async getMachineId(): Promise<string | undefined> {
    const response = await this.plexApi.query<PlexStatusResponse>(
      '/identity',
      false,
    );
    return response?.MediaContainer?.machineIdentifier;
  }

  async getLibraryItems(sectionId: string): Promise<PlexLibraryItem[]> {
    const response = await this.plexApi.queryAll<PlexLibraryResponse>({
      uri: `/library/sections/${sectionId}/all?includeGuids=1`,
    });
    return (response?.MediaContainer?.Metadata as PlexLibraryItem[]) ?? [];
  }

  async createCollection(
    sectionId: string,
    type: EPlexDataType,
    title: string,
  ): Promise<PlexCollection | undefined> {
    const response = await this.plexApi.postQuery<PlexLibraryResponse>({
      uri: `/library/collections?type=${type}&title=${encodeURIComponent(title)}&sectionId=${sectionId}`,
    });
    const metadata = response?.MediaContainer?.Metadata;
    return (Array.isArray(metadata) ? metadata[0] : metadata) as
      PlexCollection | undefined;
  }

  async getCollectionChildren(
    collectionRatingKey: string,
  ): Promise<PlexLibraryItem[]> {
    const response = await this.plexApi.queryAll<PlexLibraryResponse>({
      uri: `/library/collections/${collectionRatingKey}/children?includeGuids=1`,
    });
    return (response?.MediaContainer?.Metadata as PlexLibraryItem[]) ?? [];
  }

  async addItemsToCollection(
    collectionRatingKey: string,
    itemRatingKeys: string[],
    machineId: string,
  ): Promise<void> {
    if (itemRatingKeys.length === 0) {
      return;
    }

    const itemsUri = encodeURIComponent(
      `server://${machineId}/com.plexapp.plugins.library/library/metadata/${itemRatingKeys.join(',')}`,
    );
    await this.plexApi.putQuery({
      uri: `/library/collections/${collectionRatingKey}/items?uri=${itemsUri}`,
    });
  }

  async removeItemFromCollection(
    collectionRatingKey: string,
    itemRatingKey: string,
  ): Promise<void> {
    await this.plexApi.deleteQuery({
      uri: `/library/collections/${collectionRatingKey}/items/${itemRatingKey}`,
    });
  }

  async deleteCollection(collectionRatingKey: string): Promise<void> {
    await this.plexApi.deleteQuery({
      uri: `/library/collections/${collectionRatingKey}`,
    });
  }

  async refreshLibrary(sectionId: string): Promise<void> {
    await this.plexApi.query(`/library/sections/${sectionId}/refresh`, false);
  }

  async emptyTrash(sectionId: string): Promise<void> {
    await this.plexApi.putQuery({
      uri: `/library/sections/${sectionId}/emptyTrash`,
    });
  }
}

export const createPlexMirrorClient = (
  site: Pick<PlexMirrorSite, 'url' | 'token'>,
): PlexMirrorClient => {
  const { hostname, port, https } = parsePlexUrl(site.url);
  return new PlexMirrorClient(
    new PlexApi({
      hostname,
      port,
      https,
      token: site.token,
      timeout: PLEX_REQUEST_TIMEOUT_MS,
    }),
  );
};
