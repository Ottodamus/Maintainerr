import { Mocked, TestBed } from '@suites/unit';
import { MaintainerrLogger } from '../logging/logs.service';
import { PlexMirrorSite } from './entities/plex-mirror-site.entities';
import { PlexMirrorReconciliationService } from './plex-mirror-reconciliation.service';
import { PlexMirrorSiteService } from './plex-mirror-site.service';
import { PlexMirrorSyncService } from './plex-mirror-sync.service';

describe('PlexMirrorReconciliationService', () => {
  let service: PlexMirrorReconciliationService;
  let plexMirrorSiteService: Mocked<PlexMirrorSiteService>;
  let plexMirrorSyncService: Mocked<PlexMirrorSyncService>;
  let logger: Mocked<MaintainerrLogger>;

  beforeEach(async () => {
    const { unit, unitRef } = await TestBed.solitary(
      PlexMirrorReconciliationService,
    ).compile();

    service = unit;
    plexMirrorSiteService = unitRef.get(PlexMirrorSiteService);
    plexMirrorSyncService = unitRef.get(PlexMirrorSyncService);
    logger = unitRef.get(MaintainerrLogger);
  });

  it('does nothing when no mirror sites are configured', async () => {
    plexMirrorSiteService.getAll.mockResolvedValue([]);

    await service['executeTask']();

    expect(plexMirrorSyncService.syncSite).not.toHaveBeenCalled();
  });

  it('syncs every configured site', async () => {
    const siteA = { id: 1, siteName: 'Site A' } as PlexMirrorSite;
    const siteB = { id: 2, siteName: 'Site B' } as PlexMirrorSite;
    plexMirrorSiteService.getAll.mockResolvedValue([siteA, siteB]);
    plexMirrorSyncService.syncSite.mockResolvedValue(undefined);

    await service['executeTask']();

    expect(plexMirrorSyncService.syncSite).toHaveBeenCalledWith(siteA);
    expect(plexMirrorSyncService.syncSite).toHaveBeenCalledWith(siteB);
  });

  it('logs a warning and continues when a site fails to sync', async () => {
    const siteA = { id: 1, siteName: 'Site A' } as PlexMirrorSite;
    const siteB = { id: 2, siteName: 'Site B' } as PlexMirrorSite;
    plexMirrorSiteService.getAll.mockResolvedValue([siteA, siteB]);
    plexMirrorSyncService.syncSite.mockImplementation(async (site) => {
      if (site.id === 1) {
        throw new Error('unreachable');
      }
    });

    await service['executeTask']();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Site A'));
    // A failing site must not stop the others from syncing.
    expect(plexMirrorSyncService.syncSite).toHaveBeenCalledWith(siteB);
  });
});
