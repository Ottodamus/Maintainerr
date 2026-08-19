import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { MaintainerrLogger } from '../logging/logs.service';
import { SettingsDataService } from '../settings/settings-data.service';
import { UsersService } from '../users/users.service';
import { SESSION_COOKIE_NAME } from './auth.constants';
import { AuthController } from './auth.controller';
import { LocalLoginRateLimiter } from './local-login-rate-limiter';
import { PlexAuthService } from './plex-auth.service';

const createController = (options?: {
  clientId?: string;
  usersService?: Partial<UsersService>;
  rateLimiter?: Partial<LocalLoginRateLimiter>;
}) => {
  const settingsDataService = {
    clientId: options?.clientId ?? 'device-123',
  } as unknown as SettingsDataService;
  const logger = { setContext: jest.fn() } as unknown as MaintainerrLogger;
  const usersService = (options?.usersService ?? {}) as unknown as UsersService;
  const rateLimiter = {
    isLocked: jest.fn().mockReturnValue(false),
    recordFailure: jest.fn(),
    recordSuccess: jest.fn(),
    ...options?.rateLimiter,
  } as unknown as LocalLoginRateLimiter;
  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('signed-jwt'),
  } as unknown as JwtService;

  return new AuthController(
    {} as PlexAuthService,
    usersService,
    jwtService,
    settingsDataService,
    rateLimiter,
    logger,
  );
};

describe('AuthController', () => {
  it('exposes the configured Plex client id - the login popup needs it before any session exists', () => {
    const controller = createController({ clientId: 'device-123' });

    expect(controller.getClientId()).toEqual({ clientId: 'device-123' });
  });

  it('clears the session cookie on logout', () => {
    const controller = createController();
    const clearCookie = jest.fn();
    const response = { clearCookie } as unknown as Response;

    const result = controller.logout(response);

    expect(clearCookie).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
    expect(result).toEqual({ success: true });
  });

  describe('localLogin', () => {
    it('rejects and does not check the password when the username is locked out', async () => {
      const verifyLocalLogin = jest.fn();
      const isLocked = jest.fn().mockReturnValue(true);
      const controller = createController({
        usersService: { verifyLocalLogin },
        rateLimiter: { isLocked },
      });
      const response = { cookie: jest.fn() } as unknown as Response;

      await expect(
        controller.localLogin(
          { username: 'recovery', password: 'anything' },
          response,
        ),
      ).rejects.toThrow(UnauthorizedException);
      expect(verifyLocalLogin).not.toHaveBeenCalled();
    });

    it('records a failure and rejects on a bad password', async () => {
      const verifyLocalLogin = jest.fn().mockResolvedValue(null);
      const recordFailure = jest.fn();
      const controller = createController({
        usersService: { verifyLocalLogin },
        rateLimiter: { recordFailure },
      });
      const response = { cookie: jest.fn() } as unknown as Response;

      await expect(
        controller.localLogin(
          { username: 'Recovery', password: 'wrong' },
          response,
        ),
      ).rejects.toThrow(UnauthorizedException);
      expect(recordFailure).toHaveBeenCalledWith('recovery');
    });

    it('issues a session cookie and clears the failure count on success, without leaking the password hash', async () => {
      const user = {
        id: 9,
        plexId: null,
        plexUsername: 'recovery',
        email: null,
        thumb: null,
        role: 0,
        allowed: true,
        lastLoginAt: new Date('2026-01-01T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        passwordHash: 'salt:hash',
      };
      const verifyLocalLogin = jest.fn().mockResolvedValue(user);
      const recordSuccess = jest.fn();
      const cookie = jest.fn();
      const controller = createController({
        usersService: { verifyLocalLogin },
        rateLimiter: { recordSuccess },
      });
      const response = { cookie } as unknown as Response;

      const result = await controller.localLogin(
        { username: 'recovery', password: 'correct' },
        response,
      );

      expect(recordSuccess).toHaveBeenCalledWith('recovery');
      expect(cookie).toHaveBeenCalledWith(
        SESSION_COOKIE_NAME,
        'signed-jwt',
        expect.any(Object),
      );
      expect(result).toEqual({
        id: 9,
        plexId: null,
        plexUsername: 'recovery',
        email: null,
        thumb: null,
        role: 0,
        allowed: true,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      });
      expect(result).not.toHaveProperty('passwordHash');
    });
  });
});
