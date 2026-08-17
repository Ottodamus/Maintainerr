import { Mocked, TestBed } from '@suites/unit';
import { MaintainerrLogger } from '../logging/logs.service';
import { PlexMirrorSite } from './entities/plex-mirror-site.entities';
import { PlexMirrorReconciliationService } from './plex-mirror-reconciliation.service';
import { PlexMirrorSiteService } from './plex-mirror-site.service';

describe('PlexMirrorReconciliationService', () => {
  let service: PlexMirrorReconciliationService;
  let plexMirrorSiteService: Mocked<PlexMirrorSiteService>;
  let logger: Mocked<MaintainerrLogger>;

  beforeEach(async () => {
    const { unit, unitRef } = await TestBed.solitary(
      PlexMirrorReconciliationService,
    ).compile();

    service = unit;
    plexMirrorSiteService = unitRef.get(PlexMirrorSiteService);
    logger = unitRef.get(MaintainerrLogger);
  });

  it('does nothing when no mirror sites are configured', async () => {
    plexMirrorSiteService.getAll.mockResolvedValue([]);

    await service['executeTask']();

    expect(plexMirrorSiteService.testConnection).not.toHaveBeenCalled();
  });

  it('logs a warning for each unreachable site without throwing', async () => {
    const site = { id: 1, siteName: 'Site A' } as PlexMirrorSite;
    plexMirrorSiteService.getAll.mockResolvedValue([site]);
    plexMirrorSiteService.testConnection.mockResolvedValue({
      status: 'NOK',
      code: 0,
      message: 'unreachable',
    });

    await service['executeTask']();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Site A'));
  });

  it('logs at debug level for a reachable site', async () => {
    const site = { id: 1, siteName: 'Site A' } as PlexMirrorSite;
    plexMirrorSiteService.getAll.mockResolvedValue([site]);
    plexMirrorSiteService.testConnection.mockResolvedValue({
      status: 'OK',
      code: 1,
      message: 'Success',
    });

    await service['executeTask']();

    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Site A'),
    );
  });
});
