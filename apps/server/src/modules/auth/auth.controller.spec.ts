import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { MaintainerrLogger } from '../logging/logs.service';
import { SettingsDataService } from '../settings/settings-data.service';
import { UsersService } from '../users/users.service';
import { SESSION_COOKIE_NAME } from './auth.constants';
import { AuthController } from './auth.controller';
import { PlexAuthService } from './plex-auth.service';

const createController = (clientId: string) => {
  const settingsDataService = { clientId } as unknown as SettingsDataService;
  const logger = { setContext: jest.fn() } as unknown as MaintainerrLogger;

  return new AuthController(
    {} as PlexAuthService,
    {} as UsersService,
    {} as JwtService,
    settingsDataService,
    logger,
  );
};

describe('AuthController', () => {
  it('exposes the configured Plex client id - the login popup needs it before any session exists', () => {
    const controller = createController('device-123');

    expect(controller.getClientId()).toEqual({ clientId: 'device-123' });
  });

  it('clears the session cookie on logout', () => {
    const controller = createController('device-123');
    const clearCookie = jest.fn();
    const response = { clearCookie } as unknown as Response;

    const result = controller.logout(response);

    expect(clearCookie).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
    expect(result).toEqual({ success: true });
  });
});
