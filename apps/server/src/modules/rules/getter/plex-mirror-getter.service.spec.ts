import { createMediaItem, createMockLogger } from '../../../../test/utils/data';
import { PlexLibraryItem } from '../../api/plex-api/interfaces/library.interfaces';
import * as plexMirrorClientModule from '../../plex-mirror/plex-mirror-client';
import { PlexMirrorSite } from '../../plex-mirror/entities/plex-mirror-site.entities';
import { PlexMirrorSiteService } from '../../plex-mirror/plex-mirror-site.service';
import { ArrLookupCache } from '../helpers/arr-lookup-cache';
import { PlexMirrorGetterService } from './plex-mirror-getter.service';

jest.mock('../../plex-mirror/plex-mirror-client', () => {
  const actual = jest.requireActual('../../plex-mirror/plex-mirror-client');
  return {
    ...actual,
    createPlexMirrorClient: jest.fn(),
  };
});

const COMBINED_VIEW_COUNT_PROP_ID = 0;
const COMBINED_LAST_VIEWED_AT_PROP_ID = 1;

describe('PlexMirrorGetterService', () => {
  const siteA: PlexMirrorSite = {
    id: 1,
    siteName: 'Site A',
    url: 'http://10.0.0.5:32400',
    token: 'tok-a',
    librarySectionId: '1',
  };
  const siteB: PlexMirrorSite = {
    id: 2,
    siteName: 'Site B',
    url: 'http://10.0.0.6:32400',
    token: 'tok-b',
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

  const clientsByToken = new Map<string, ReturnType<typeof buildClient>>();

  const createService = (sites: PlexMirrorSite[]) => {
    const plexMirrorSiteService = {
      getAll: jest.fn().mockResolvedValue(sites),
    } as unknown as jest.Mocked<PlexMirrorSiteService>;

    const service = new PlexMirrorGetterService(
      plexMirrorSiteService,
      createMockLogger(),
    );

    return { service, plexMirrorSiteService };
  };

  const remoteItem = (
    overrides: Partial<PlexLibraryItem> & Pick<PlexLibraryItem, 'ratingKey'>,
  ): PlexLibraryItem =>
    ({
      guid: '',
      Guid: [],
      viewCount: 0,
      lastViewedAt: 0,
      ...overrides,
    }) as PlexLibraryItem;

  beforeEach(() => {
    clientsByToken.clear();
    (
      plexMirrorClientModule.createPlexMirrorClient as jest.Mock
    ).mockImplementation((site: PlexMirrorSite) => {
      const client = clientsByToken.get(site.token) ?? buildClient();
      clientsByToken.set(site.token, client);
      return client;
    });
  });

  it('returns null for an unknown property id', async () => {
    const { service } = createService([]);
    const libItem = createMediaItem({ type: 'movie' });

    expect(await service.get(999, libItem, new ArrLookupCache())).toBeNull();
  });

  it('returns undefined (fail closed) when no run cache is supplied', async () => {
    const { service, plexMirrorSiteService } = createService([siteA]);
    const libItem = createMediaItem({ type: 'movie' });

    expect(
      await service.get(COMBINED_VIEW_COUNT_PROP_ID, libItem),
    ).toBeUndefined();
    expect(plexMirrorSiteService.getAll).not.toHaveBeenCalled();
  });

  describe('with no mirror sites configured', () => {
    it('falls back to the primary server own viewCount/lastViewedAt', async () => {
      const { service } = createService([]);
      const libItem = createMediaItem({
        type: 'movie',
        viewCount: 4,
        lastViewedAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      expect(
        await service.get(
          COMBINED_VIEW_COUNT_PROP_ID,
          libItem,
          new ArrLookupCache(),
        ),
      ).toBe(4);
      expect(
        await service.get(
          COMBINED_LAST_VIEWED_AT_PROP_ID,
          libItem,
          new ArrLookupCache(),
        ),
      ).toEqual(new Date('2026-01-01T00:00:00.000Z'));
    });
  });

  describe('combinedViewCount', () => {
    it('sums the primary and every matched mirror site view count', async () => {
      const { service } = createService([siteA, siteB]);
      const libItem = createMediaItem({
        type: 'movie',
        viewCount: 2,
        providerIds: { tmdb: ['42'], tvdb: [] },
      });

      const clientA = buildClient();
      const clientB = buildClient();
      clientsByToken.set('tok-a', clientA);
      clientsByToken.set('tok-b', clientB);
      clientA.getLibraryItems.mockResolvedValue([
        remoteItem({
          ratingKey: 'rk-a',
          Guid: [{ id: 'tmdb://42' }],
          viewCount: 3,
        }),
      ]);
      clientB.getLibraryItems.mockResolvedValue([
        remoteItem({
          ratingKey: 'rk-b',
          Guid: [{ id: 'tmdb://42' }],
          viewCount: 1,
        }),
      ]);

      const result = await service.get(
        COMBINED_VIEW_COUNT_PROP_ID,
        libItem,
        new ArrLookupCache(),
      );

      expect(result).toBe(6);
    });

    it('does not count a site where the title has no match', async () => {
      const { service } = createService([siteA]);
      const libItem = createMediaItem({
        type: 'movie',
        viewCount: 1,
        providerIds: { tmdb: ['42'], tvdb: [] },
      });

      const clientA = buildClient();
      clientsByToken.set('tok-a', clientA);
      clientA.getLibraryItems.mockResolvedValue([
        remoteItem({
          ratingKey: 'rk-a',
          Guid: [{ id: 'tmdb://999999' }],
          viewCount: 5,
        }),
      ]);

      expect(
        await service.get(
          COMBINED_VIEW_COUNT_PROP_ID,
          libItem,
          new ArrLookupCache(),
        ),
      ).toBe(1);
    });

    it('drops a site that fails to sweep instead of failing the whole lookup', async () => {
      const { service } = createService([siteA, siteB]);
      const libItem = createMediaItem({
        type: 'movie',
        viewCount: 1,
        providerIds: { tmdb: ['42'], tvdb: [] },
      });

      const clientA = buildClient();
      const clientB = buildClient();
      clientsByToken.set('tok-a', clientA);
      clientsByToken.set('tok-b', clientB);
      clientA.getLibraryItems.mockRejectedValue(new Error('unreachable'));
      clientB.getLibraryItems.mockResolvedValue([
        remoteItem({
          ratingKey: 'rk-b',
          Guid: [{ id: 'tmdb://42' }],
          viewCount: 2,
        }),
      ]);

      expect(
        await service.get(
          COMBINED_VIEW_COUNT_PROP_ID,
          libItem,
          new ArrLookupCache(),
        ),
      ).toBe(3);
    });
  });

  describe('combinedLastViewedAt', () => {
    it('returns the most recent timestamp across the primary and every mirror site', async () => {
      const { service } = createService([siteA, siteB]);
      const libItem = createMediaItem({
        type: 'movie',
        lastViewedAt: new Date('2026-01-01T00:00:00.000Z'),
        providerIds: { tmdb: ['42'], tvdb: [] },
      });

      const clientA = buildClient();
      const clientB = buildClient();
      clientsByToken.set('tok-a', clientA);
      clientsByToken.set('tok-b', clientB);
      clientA.getLibraryItems.mockResolvedValue([
        remoteItem({
          ratingKey: 'rk-a',
          Guid: [{ id: 'tmdb://42' }],
          lastViewedAt: 1_800_000_000, // 2027-01-15
        }),
      ]);
      clientB.getLibraryItems.mockResolvedValue([
        remoteItem({
          ratingKey: 'rk-b',
          Guid: [{ id: 'tmdb://42' }],
          lastViewedAt: 1_600_000_000, // 2020-09-13
        }),
      ]);

      const result = await service.get(
        COMBINED_LAST_VIEWED_AT_PROP_ID,
        libItem,
        new ArrLookupCache(),
      );

      expect(result).toEqual(new Date(1_800_000_000 * 1000));
    });

    it('returns null when the item was never viewed anywhere', async () => {
      const { service } = createService([siteA]);
      const libItem = createMediaItem({
        type: 'movie',
        lastViewedAt: undefined,
        providerIds: { tmdb: ['42'], tvdb: [] },
      });

      const clientA = buildClient();
      clientsByToken.set('tok-a', clientA);
      clientA.getLibraryItems.mockResolvedValue([
        remoteItem({
          ratingKey: 'rk-a',
          Guid: [{ id: 'tmdb://42' }],
          viewCount: 0,
          lastViewedAt: 0,
        }),
      ]);

      expect(
        await service.get(
          COMBINED_LAST_VIEWED_AT_PROP_ID,
          libItem,
          new ArrLookupCache(),
        ),
      ).toBeNull();
    });
  });

  it('sweeps every mirror site only once per run cache', async () => {
    const { service } = createService([siteA]);
    const cache = new ArrLookupCache();

    const clientA = buildClient();
    clientsByToken.set('tok-a', clientA);
    clientA.getLibraryItems.mockResolvedValue([]);

    const itemOne = createMediaItem({ type: 'movie' });
    const itemTwo = createMediaItem({ type: 'movie' });

    await service.get(COMBINED_VIEW_COUNT_PROP_ID, itemOne, cache);
    await service.get(COMBINED_VIEW_COUNT_PROP_ID, itemTwo, cache);

    expect(clientA.getLibraryItems).toHaveBeenCalledTimes(1);
  });
});
