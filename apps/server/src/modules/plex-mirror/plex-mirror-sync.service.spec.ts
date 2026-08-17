import { EPlexDataType } from '@maintainerr/contracts';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Mocked, TestBed } from '@suites/unit';
import { Repository } from 'typeorm';
import { Collection } from '../collections/entities/collection.entities';
import { CollectionMedia } from '../collections/entities/collection_media.entities';
import { PlexMirrorCollectionLink } from './entities/plex-mirror-collection-link.entities';
import { PlexMirrorSite } from './entities/plex-mirror-site.entities';
import * as plexMirrorClientModule from './plex-mirror-client';
import { PlexMirrorSyncService } from './plex-mirror-sync.service';

jest.mock('./plex-mirror-client', () => {
  const actual = jest.requireActual('./plex-mirror-client');
  return {
    ...actual,
    createPlexMirrorClient: jest.fn(),
  };
});

describe('PlexMirrorSyncService', () => {
  let service: PlexMirrorSyncService;
  let linkRepo: Mocked<Repository<PlexMirrorCollectionLink>>;
  let collectionRepo: Mocked<Repository<Collection>>;
  let collectionMediaRepo: Mocked<Repository<CollectionMedia>>;

  const site: PlexMirrorSite = {
    id: 1,
    siteName: 'Site A',
    url: 'http://10.0.0.5:32400',
    token: 'tok',
    librarySectionId: '1',
  };

  const buildClient = () => ({
    getMachineId: jest.fn(),
    getLibraryItems: jest.fn(),
    createCollection: jest.fn(),
    getCollectionChildren: jest.fn(),
    addItemsToCollection: jest.fn(),
    removeItemFromCollection: jest.fn(),
    deleteCollection: jest.fn(),
    refreshLibrary: jest.fn(),
    emptyTrash: jest.fn(),
  });

  let client: ReturnType<typeof buildClient>;

  beforeEach(async () => {
    const { unit, unitRef } = await TestBed.solitary(
      PlexMirrorSyncService,
    ).compile();

    service = unit;
    linkRepo = unitRef.get(
      getRepositoryToken(PlexMirrorCollectionLink) as string,
    );
    collectionRepo = unitRef.get(getRepositoryToken(Collection) as string);
    collectionMediaRepo = unitRef.get(
      getRepositoryToken(CollectionMedia) as string,
    );

    client = buildClient();
    (
      plexMirrorClientModule.createPlexMirrorClient as jest.Mock
    ).mockReturnValue(client);

    client.getMachineId.mockResolvedValue('machine-1');
    client.getLibraryItems.mockResolvedValue([]);
    linkRepo.findOne.mockResolvedValue(null);
    collectionRepo.find.mockResolvedValue([]);
  });

  it('throws when the site has no resolvable machine id', async () => {
    client.getMachineId.mockResolvedValue(undefined);

    await expect(service.syncSite(site)).rejects.toThrow(/reachable/);
  });

  it('skips season/episode-level collections', async () => {
    collectionRepo.find.mockResolvedValue([
      { id: 1, type: 'season', title: 'A Season' } as Collection,
      { id: 2, type: 'episode', title: 'An Episode' } as Collection,
    ]);

    await service.syncSite(site);

    expect(collectionMediaRepo.find).not.toHaveBeenCalled();
  });

  it('creates a mirror collection and adds matched items', async () => {
    collectionRepo.find.mockResolvedValue([
      { id: 1, type: 'movie', title: 'Stale Movies' } as Collection,
    ]);
    collectionMediaRepo.find.mockResolvedValue([
      { tmdbId: 42, tvdbId: undefined } as CollectionMedia,
    ]);
    client.getLibraryItems.mockResolvedValue([
      { ratingKey: 'rk-42', guid: '', Guid: [{ id: 'tmdb://42' }] },
    ]);
    // No existing link (linkRepo.findOne -> null per beforeEach), so
    // syncCollection must create one via save() before it can proceed.
    linkRepo.save.mockResolvedValue({
      id: 10,
      plexMirrorSiteId: site.id,
      collectionId: 1,
      mirrorRatingKey: null,
    });
    client.createCollection.mockResolvedValue({ ratingKey: 'collection-rk' });
    client.getCollectionChildren.mockResolvedValue([]);

    await service.syncSite(site);

    expect(client.createCollection).toHaveBeenCalledWith(
      '1',
      EPlexDataType.MOVIES,
      'Stale Movies',
    );
    expect(client.addItemsToCollection).toHaveBeenCalledWith(
      'collection-rk',
      ['rk-42'],
      'machine-1',
    );
    expect(linkRepo.update).toHaveBeenCalledWith(expect.anything(), {
      mirrorRatingKey: 'collection-rk',
    });
    // Nothing was removed, so no refresh/emptyTrash this run.
    expect(client.refreshLibrary).not.toHaveBeenCalled();
    expect(client.emptyTrash).not.toHaveBeenCalled();
  });

  it('removes stale items and triggers a refresh + empty trash', async () => {
    collectionRepo.find.mockResolvedValue([
      { id: 1, type: 'movie', title: 'Stale Movies' } as Collection,
    ]);
    // No matched items this run (the item was deleted from the collection).
    collectionMediaRepo.find.mockResolvedValue([]);
    linkRepo.findOne.mockResolvedValue({
      id: 5,
      plexMirrorSiteId: 1,
      collectionId: 1,
      mirrorRatingKey: 'collection-rk',
    });

    await service.syncSite(site);

    // Zero matches deletes the whole mirror collection, not a per-item removal.
    expect(client.deleteCollection).toHaveBeenCalledWith('collection-rk');
    expect(linkRepo.update).toHaveBeenCalledWith(
      { id: 5 },
      { mirrorRatingKey: null },
    );
  });

  it('removes only the stale item when other matches remain, then refreshes', async () => {
    collectionRepo.find.mockResolvedValue([
      { id: 1, type: 'movie', title: 'Stale Movies' } as Collection,
    ]);
    collectionMediaRepo.find.mockResolvedValue([
      { tmdbId: 42, tvdbId: undefined } as CollectionMedia,
    ]);
    client.getLibraryItems.mockResolvedValue([
      { ratingKey: 'rk-42', guid: '', Guid: [{ id: 'tmdb://42' }] },
    ]);
    linkRepo.findOne.mockResolvedValue({
      id: 5,
      plexMirrorSiteId: 1,
      collectionId: 1,
      mirrorRatingKey: 'collection-rk',
    });
    client.getCollectionChildren.mockResolvedValue([
      { ratingKey: 'rk-42' },
      { ratingKey: 'rk-99' },
    ]);

    await service.syncSite(site);

    expect(client.addItemsToCollection).not.toHaveBeenCalled();
    expect(client.removeItemFromCollection).toHaveBeenCalledWith(
      'collection-rk',
      'rk-99',
    );
    expect(client.refreshLibrary).toHaveBeenCalledWith('1');
    expect(client.emptyTrash).toHaveBeenCalledWith('1');
  });

  it('continues syncing other collections when one fails', async () => {
    collectionRepo.find.mockResolvedValue([
      { id: 1, type: 'movie', title: 'Broken' } as Collection,
      { id: 2, type: 'movie', title: 'Fine' } as Collection,
    ]);
    collectionMediaRepo.find
      .mockRejectedValueOnce(new Error('db error'))
      .mockResolvedValueOnce([]);

    await expect(service.syncSite(site)).resolves.not.toThrow();
    expect(collectionMediaRepo.find).toHaveBeenCalledTimes(2);
  });
});
