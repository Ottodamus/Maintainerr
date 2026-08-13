import axios from 'axios';
import { MaintainerrLogger } from '../logging/logs.service';
import { SettingsDataService } from '../settings/settings-data.service';
import { PlexAuthService } from './plex-auth.service';

jest.mock('axios');

describe('PlexAuthService', () => {
  const settingsDataService = {
    clientId: 'test-client-id',
  } as unknown as jest.Mocked<SettingsDataService>;

  const logger = {
    setContext: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  } as unknown as jest.Mocked<MaintainerrLogger>;

  let service: PlexAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlexAuthService(settingsDataService, logger);
  });

  it('resolves an account from a valid authToken', async () => {
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        id: 42,
        username: 'someuser',
        email: 'someuser@example.com',
        thumb: 'https://plex.tv/thumb.jpg',
      },
    });

    const account = await service.getAccount('valid-token');

    expect(account).toEqual({
      id: 42,
      username: 'someuser',
      email: 'someuser@example.com',
      thumb: 'https://plex.tv/thumb.jpg',
    });
    expect(axios.get).toHaveBeenCalledWith(
      'https://plex.tv/api/v2/user',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Plex-Token': 'valid-token',
          'X-Plex-Client-Identifier': 'test-client-id',
        }),
      }),
    );
  });

  it('returns undefined and logs a warning when plex.tv rejects the token', async () => {
    (axios.get as jest.Mock).mockRejectedValue(new Error('request failed'));

    const account = await service.getAccount('invalid-token');

    expect(account).toBeUndefined();
    expect(logger.warn).toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(expect.any(Error));
  });

  it('defaults missing email/thumb to null rather than undefined', async () => {
    (axios.get as jest.Mock).mockResolvedValue({
      data: { id: 1, username: 'noemail' },
    });

    const account = await service.getAccount('token');

    expect(account).toEqual({
      id: 1,
      username: 'noemail',
      email: null,
      thumb: null,
    });
  });
});
