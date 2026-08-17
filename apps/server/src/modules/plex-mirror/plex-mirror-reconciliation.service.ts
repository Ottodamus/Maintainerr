import { Injectable } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import { MaintainerrLogger } from '../logging/logs.service';
import { TaskBase } from '../tasks/task.base';
import { TasksService } from '../tasks/tasks.service';
import { PlexMirrorSiteService } from './plex-mirror-site.service';

/**
 * Foundation-stage reconciliation: confirms each configured mirror site is
 * reachable on a schedule, self-healing operator visibility into a site that
 * dropped off the network (Syncthing outage, site down, token revoked).
 *
 * Deliberately does not yet resolve titles or push a per-site "Leaving Soon"
 * collection - that needs cross-server provider-id matching, which has no
 * existing precedent in this codebase and is scoped as a separate follow-up
 * once this foundation (site CRUD, connectivity test, this schedule) is
 * proven. See the mirror-sites plan for the phase split.
 */
@Injectable()
export class PlexMirrorReconciliationService extends TaskBase {
  protected name = 'Plex Mirror Reconciliation';
  protected cronSchedule = CronExpression.EVERY_30_MINUTES;

  constructor(
    protected readonly taskService: TasksService,
    protected readonly logger: MaintainerrLogger,
    private readonly plexMirrorSiteService: PlexMirrorSiteService,
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
      const result = await this.plexMirrorSiteService.testConnection(site);

      if (result.status === 'OK') {
        this.logger.debug(`Mirror site '${site.siteName}' is reachable`);
      } else {
        this.logger.warn(
          `Mirror site '${site.siteName}' is unreachable: ${result.message}`,
        );
      }
    }
  }
}
