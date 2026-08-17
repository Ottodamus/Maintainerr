import { Injectable } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import { getErrorMessage } from '../../utils/connection-error';
import { MaintainerrLogger } from '../logging/logs.service';
import { TaskBase } from '../tasks/task.base';
import { TasksService } from '../tasks/tasks.service';
import { PlexMirrorSiteService } from './plex-mirror-site.service';
import { PlexMirrorSyncService } from './plex-mirror-sync.service';

/**
 * Reconciles every configured mirror site on a schedule: pushes each
 * visible, movie/show-level collection's current membership onto the site's
 * own "Leaving Soon" collection (see PlexMirrorSyncService) and self-heals
 * anything a site missed (Syncthing outage, site down, token revoked) since
 * the sync itself is what proves reachability - there is no separate
 * throwaway ping.
 */
@Injectable()
export class PlexMirrorReconciliationService extends TaskBase {
  protected name = 'Plex Mirror Reconciliation';
  protected cronSchedule = CronExpression.EVERY_30_MINUTES;

  constructor(
    protected readonly taskService: TasksService,
    protected readonly logger: MaintainerrLogger,
    private readonly plexMirrorSiteService: PlexMirrorSiteService,
    private readonly plexMirrorSyncService: PlexMirrorSyncService,
  ) {
    logger.setContext(PlexMirrorReconciliationService.name);
    super(taskService, logger);
  }

  protected async executeTask(): Promise<void> {
    const sites = await this.plexMirrorSiteService.getAll();

    if (sites.length === 0) {
      return;
    }

    for (const site of sites) {
      try {
        await this.plexMirrorSyncService.syncSite(site);
        this.logger.debug(`Synced mirror site '${site.siteName}'`);
      } catch (error) {
        this.logger.warn(
          `Failed to sync mirror site '${site.siteName}': ${getErrorMessage(error)}`,
        );
        this.logger.debug(error);
      }
    }
  }
}
