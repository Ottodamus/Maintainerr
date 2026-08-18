import { MediaItem, RuleValueType } from '@maintainerr/contracts';
import { Injectable } from '@nestjs/common';
import { PlexLibraryItem } from '../../api/plex-api/interfaces/library.interfaces';
import { MaintainerrLogger } from '../../logging/logs.service';
import { createPlexMirrorClient } from '../../plex-mirror/plex-mirror-client';
import {
  buildProviderIdIndex,
  firstNumericId,
  ProviderIdIndex,
  resolveByProviderIds,
} from '../../plex-mirror/plex-mirror-matching.util';
import { PlexMirrorSiteService } from '../../plex-mirror/plex-mirror-site.service';
import {
  Application,
  Property,
  RuleConstants,
} from '../constants/rules.constants';
import { ArrLookupCache } from '../helpers/arr-lookup-cache';

interface SiteWatchEntry {
  siteName: string;
  viewCount: number;
  lastViewedAt?: Date;
}

// Shared across every item in a rule-group run via ArrLookupCache.memoize -
// the sweep-every-mirror-site's-whole-library cost is paid once per run, not
// once per item (see buildSiteIndexes).
const MIRROR_INDEX_CACHE_KEY = 'plexMirror:siteWatchIndexes';

/**
 * Resolves "combined" watch-data rule properties: this server's own
 * viewCount/lastViewedAt plus every configured mirror site's native watch
 * data for the same title, matched by imdb/tmdb/tvdb id (see
 * plex-mirror-matching.util.ts - the same matching PlexMirrorSyncService uses
 * to push the "Leaving Soon" collection onto each site).
 *
 * Movie/show level only, matching PlexMirrorSyncService's scope: a season or
 * episode match would need a second resolution step within the matched show
 * on each site. Gated to Plex + at least one configured mirror site via
 * rule-application-availability.helper.ts.
 */
@Injectable()
export class PlexMirrorGetterService {
  appProperties: Property[];

  constructor(
    private readonly plexMirrorSiteService: PlexMirrorSiteService,
    private readonly logger: MaintainerrLogger,
  ) {
    logger.setContext(PlexMirrorGetterService.name);
    const ruleConstants = new RuleConstants();
    this.appProperties = ruleConstants.applications.find(
      (el) => el.id === Application.PLEX_MIRROR,
    ).props;
  }

  async get(
    id: number,
    libItem: MediaItem,
    arrLookupCache?: ArrLookupCache,
  ): Promise<RuleValueType> {
    const prop = this.appProperties.find((el) => el.id === id);
    if (!prop) {
      return null;
    }

    if (!arrLookupCache) {
      // Threaded in from the executor on every real run. Without it there is
      // no safe way to reuse a swept-once-per-run index, so fail closed
      // rather than sweep every mirror site's whole library per item.
      this.logger.warn('PlexMirror-Getter - no run cache available, skipping');
      return undefined;
    }

    const indexes = await arrLookupCache.memoize(MIRROR_INDEX_CACHE_KEY, () =>
      this.buildSiteIndexes(),
    );

    const tmdbId = firstNumericId(libItem.providerIds?.tmdb);
    const tvdbId = firstNumericId(libItem.providerIds?.tvdb);

    const entries = indexes
      .map((index) => resolveByProviderIds({ tmdbId, tvdbId }, index))
      .filter((entry): entry is SiteWatchEntry => entry != null);

    switch (prop.name) {
      case 'combinedViewCount': {
        return (
          (libItem.viewCount ?? 0) +
          entries.reduce((sum, entry) => sum + entry.viewCount, 0)
        );
      }
      case 'combinedLastViewedAt': {
        const timestamps = [
          libItem.lastViewedAt?.getTime() ?? 0,
          ...entries.map((entry) => entry.lastViewedAt?.getTime() ?? 0),
        ];
        const newest = Math.max(...timestamps);
        return newest > 0 ? new Date(newest) : null;
      }
      default: {
        return null;
      }
    }
  }

  /**
   * One provider-id index per reachable mirror site (not merged into one -
   * the same title exists on every mirror, so summing needs each site's own
   * contribution kept separate). A site that fails to sweep is dropped
   * rather than failing the whole run; the properties above then simply
   * reflect the primary server's own count plus whichever sites answered.
   */
  private async buildSiteIndexes(): Promise<ProviderIdIndex<SiteWatchEntry>[]> {
    const sites = await this.plexMirrorSiteService.getAll();

    const indexes = await Promise.all(
      sites.map(async (site) => {
        try {
          const client = createPlexMirrorClient(site);
          const items = await client.getLibraryItems(site.librarySectionId);
          return buildProviderIdIndex(items, (item) =>
            this.toWatchEntry(site.siteName, item),
          );
        } catch (error) {
          this.logger.warn(
            `PlexMirror-Getter - failed to sweep mirror site '${site.siteName}' for watch data`,
          );
          this.logger.debug(error);
          return null;
        }
      }),
    );

    return indexes.filter(
      (index): index is ProviderIdIndex<SiteWatchEntry> => index !== null,
    );
  }

  private toWatchEntry(
    siteName: string,
    item: PlexLibraryItem,
  ): SiteWatchEntry {
    return {
      siteName,
      viewCount: item.viewCount ?? 0,
      lastViewedAt: item.lastViewedAt
        ? new Date(item.lastViewedAt * 1000)
        : undefined,
    };
  }
}
