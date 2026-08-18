import { PlexMapper } from '../api/media-server/plex/plex.mapper';
import { PlexLibraryItem } from '../api/plex-api/interfaces/library.interfaces';

/**
 * Cross-server title matching by imdb/tmdb/tvdb id - Plex exposes no
 * server-side "find by external id" lookup, so every mirror-site consumer
 * (collection sync, the combined-watch-data rule getter) has to build this
 * index client-side from a full library sweep. Shared here rather than
 * duplicated per consumer.
 */
export interface ProviderIdIndex<T> {
  tmdb: Map<number, T>;
  tvdb: Map<number, T>;
}

export const buildProviderIdIndex = <T>(
  items: PlexLibraryItem[],
  payloadFor: (item: PlexLibraryItem) => T,
): ProviderIdIndex<T> => {
  const index: ProviderIdIndex<T> = { tmdb: new Map(), tvdb: new Map() };

  for (const item of items) {
    const providerIds = PlexMapper.extractProviderIds(item.Guid, item.guid);
    const payload = payloadFor(item);

    for (const id of providerIds.tmdb ?? []) {
      const numericId = Number(id);
      if (!Number.isNaN(numericId)) {
        index.tmdb.set(numericId, payload);
      }
    }

    for (const id of providerIds.tvdb ?? []) {
      const numericId = Number(id);
      if (!Number.isNaN(numericId)) {
        index.tvdb.set(numericId, payload);
      }
    }
  }

  return index;
};

export const resolveByProviderIds = <T>(
  ids: { tmdbId?: number | null; tvdbId?: number | null },
  index: ProviderIdIndex<T>,
): T | undefined =>
  (ids.tmdbId != null ? index.tmdb.get(ids.tmdbId) : undefined) ??
  (ids.tvdbId != null ? index.tvdb.get(ids.tvdbId) : undefined);

/** First valid numeric id in a provider-id string array (e.g. MediaItem.providerIds.tmdb). */
export const firstNumericId = (ids?: string[]): number | undefined => {
  for (const id of ids ?? []) {
    const numericId = Number(id);
    if (!Number.isNaN(numericId)) {
      return numericId;
    }
  }
  return undefined;
};
