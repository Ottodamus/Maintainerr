import { EPlexDataType } from '@maintainerr/contracts';
import { PlexMirrorClient } from './plex-mirror-client';

describe('PlexMirrorClient', () => {
  const buildFakePlexApi = () => ({
    query: jest.fn(),
    queryAll: jest.fn(),
    postQuery: jest.fn(),
    putQuery: jest.fn(),
    deleteQuery: jest.fn(),
  });

  it('extracts machineIdentifier from /identity', async () => {
    const plexApi = buildFakePlexApi();
    plexApi.query.mockResolvedValue({
      MediaContainer: { machineIdentifier: 'abc123' },
    });
    const client = new PlexMirrorClient(plexApi as never);

    await expect(client.getMachineId()).resolves.toBe('abc123');
    expect(plexApi.query).toHaveBeenCalledWith('/identity', false);
  });

  it('builds the collection-items URI with the site machine id, comma-joined ratingKeys', async () => {
    const plexApi = buildFakePlexApi();
    plexApi.putQuery.mockResolvedValue(undefined);
    const client = new PlexMirrorClient(plexApi as never);

    await client.addItemsToCollection('999', ['1', '2'], 'machine-1');

    const expectedUri = encodeURIComponent(
      'server://machine-1/com.plexapp.plugins.library/library/metadata/1,2',
    );
    expect(plexApi.putQuery).toHaveBeenCalledWith({
      uri: `/library/collections/999/items?uri=${expectedUri}`,
    });
  });

  it('does not call Plex when there are no items to add', async () => {
    const plexApi = buildFakePlexApi();
    const client = new PlexMirrorClient(plexApi as never);

    await client.addItemsToCollection('999', [], 'machine-1');

    expect(plexApi.putQuery).not.toHaveBeenCalled();
  });

  it('creates a collection with the numeric Plex type and encoded title', async () => {
    const plexApi = buildFakePlexApi();
    plexApi.postQuery.mockResolvedValue({
      MediaContainer: { Metadata: [{ ratingKey: 'new-rk' }] },
    });
    const client = new PlexMirrorClient(plexApi as never);

    const result = await client.createCollection(
      '1',
      EPlexDataType.MOVIES,
      'Stale Movies',
    );

    expect(plexApi.postQuery).toHaveBeenCalledWith({
      uri: '/library/collections?type=1&title=Stale%20Movies&sectionId=1',
    });
    expect(result).toEqual({ ratingKey: 'new-rk' });
  });

  it('empties the trash for the given library section', async () => {
    const plexApi = buildFakePlexApi();
    const client = new PlexMirrorClient(plexApi as never);

    await client.emptyTrash('1');

    expect(plexApi.putQuery).toHaveBeenCalledWith({
      uri: '/library/sections/1/emptyTrash',
    });
  });

  it('refreshes the given library section', async () => {
    const plexApi = buildFakePlexApi();
    const client = new PlexMirrorClient(plexApi as never);

    await client.refreshLibrary('1');

    expect(plexApi.query).toHaveBeenCalledWith(
      '/library/sections/1/refresh',
      false,
    );
  });
});
