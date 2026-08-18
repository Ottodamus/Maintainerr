import { PlexLibraryItem } from '../api/plex-api/interfaces/library.interfaces';
import {
  buildProviderIdIndex,
  firstNumericId,
  resolveByProviderIds,
} from './plex-mirror-matching.util';

describe('buildProviderIdIndex / resolveByProviderIds', () => {
  const items: PlexLibraryItem[] = [
    {
      ratingKey: 'rk-movie',
      guid: '',
      Guid: [{ id: 'tmdb://42' }],
    } as PlexLibraryItem,
    {
      ratingKey: 'rk-show',
      guid: '',
      Guid: [{ id: 'tvdb://990013' }],
    } as PlexLibraryItem,
    // Legacy agent: only the top-level `guid` carries the provider id.
    {
      ratingKey: 'rk-legacy',
      guid: 'com.plexapp.agents.themoviedb://777',
    } as PlexLibraryItem,
  ];

  it('indexes items by tmdb and tvdb id, keyed by the extracted payload', () => {
    const index = buildProviderIdIndex(items, (item) => item.ratingKey);

    expect(index.tmdb.get(42)).toBe('rk-movie');
    expect(index.tvdb.get(990013)).toBe('rk-show');
    expect(index.tmdb.get(777)).toBe('rk-legacy');
  });

  it('resolves by tmdbId first, falling back to tvdbId', () => {
    const index = buildProviderIdIndex(items, (item) => item.ratingKey);

    expect(resolveByProviderIds({ tmdbId: 42 }, index)).toBe('rk-movie');
    expect(resolveByProviderIds({ tvdbId: 990013 }, index)).toBe('rk-show');
    expect(
      resolveByProviderIds({ tmdbId: undefined, tvdbId: undefined }, index),
    ).toBeUndefined();
  });

  it('returns undefined for an id with no match', () => {
    const index = buildProviderIdIndex(items, (item) => item.ratingKey);

    expect(resolveByProviderIds({ tmdbId: 999999 }, index)).toBeUndefined();
  });
});

describe('firstNumericId', () => {
  it('returns the first valid numeric id in the array', () => {
    expect(firstNumericId(['42', '43'])).toBe(42);
  });

  it('skips non-numeric entries and returns the next valid one', () => {
    expect(firstNumericId(['not-a-number', '43'])).toBe(43);
  });

  it('returns undefined for an empty or missing array', () => {
    expect(firstNumericId([])).toBeUndefined();
    expect(firstNumericId(undefined)).toBeUndefined();
  });
});
