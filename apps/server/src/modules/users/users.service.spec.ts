import { UserRole } from '@maintainerr/contracts';
import { ForbiddenException } from '@nestjs/common';
import { FindOperator, Repository } from 'typeorm';
import { PlexAccount } from '../auth/plex-auth.service';
import { hashPassword } from '../auth/password-hash.util';
import { MaintainerrLogger } from '../logging/logs.service';
import { User } from './entities/user.entities';
import { UsersService } from './users.service';

const isNullOperator = (value: unknown) =>
  value instanceof FindOperator && value.type === 'isNull';

describe('UsersService', () => {
  const userRepo = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    count: jest.fn(),
    create: jest.fn((data: Partial<User>) => data as User),
    save: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<Repository<User>>;

  const logger = {
    setContext: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
  } as unknown as jest.Mocked<MaintainerrLogger>;

  let service: UsersService;

  const account: PlexAccount = {
    id: 555,
    username: 'SomeUser',
    email: 'someuser@example.com',
    thumb: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(userRepo, logger);
  });

  describe('claimOrCreateOnLogin', () => {
    it('updates and returns an already-known user by plexId', async () => {
      const existing = { id: 1, plexId: '555', allowed: true } as User;
      (userRepo.findOneBy as jest.Mock).mockResolvedValueOnce(existing);
      (userRepo.findOneBy as jest.Mock).mockResolvedValueOnce({
        ...existing,
        lastLoginAt: new Date(),
      });

      const result = await service.claimOrCreateOnLogin(account);

      expect(userRepo.update).toHaveBeenCalledWith(
        { id: 1 },
        expect.objectContaining({ plexUsername: 'someuser' }),
      );
      expect(result.id).toBe(1);
    });

    it('rejects an already-known but disabled account without granting a session - whether still pending review or explicitly revoked', async () => {
      const existing = { id: 1, plexId: '555', allowed: false } as User;
      (userRepo.findOneBy as jest.Mock).mockResolvedValueOnce(existing);

      await expect(service.claimOrCreateOnLogin(account)).rejects.toThrow(
        ForbiddenException,
      );
      expect(userRepo.update).not.toHaveBeenCalled();
    });

    it('claims an admin-created invite matched by lowercased username', async () => {
      (userRepo.findOneBy as jest.Mock)
        .mockResolvedValueOnce(null) // no existing plexId match
        .mockResolvedValueOnce({ id: 2, plexUsername: 'someuser' }); // invited row
      (userRepo.findOneBy as jest.Mock).mockResolvedValueOnce({
        id: 2,
        plexId: '555',
      });

      await service.claimOrCreateOnLogin(account);

      expect(userRepo.update).toHaveBeenCalledWith(
        { id: 2 },
        expect.objectContaining({ plexId: '555' }),
      );
      // The invite lookup must exclude break-glass rows, so a Plex account
      // can never take one over just by matching its username.
      const inviteLookupWhere = (userRepo.findOneBy as jest.Mock).mock
        .calls[1][0];
      expect(isNullOperator(inviteLookupWhere.passwordHash)).toBe(true);
    });

    it('bootstraps the first-ever login as ADMIN when nobody is invited', async () => {
      (userRepo.findOneBy as jest.Mock).mockResolvedValue(null);
      (userRepo.count as jest.Mock).mockResolvedValue(0);
      (userRepo.save as jest.Mock).mockImplementation((u) => u);

      const result = await service.claimOrCreateOnLogin(account);

      expect(result).toEqual(
        expect.objectContaining({ role: UserRole.ADMIN, allowed: true }),
      );
    });

    it('records an access request and rejects an uninvited account once at least one user already exists', async () => {
      (userRepo.findOneBy as jest.Mock).mockResolvedValue(null);
      (userRepo.count as jest.Mock).mockResolvedValue(1);
      (userRepo.save as jest.Mock).mockImplementation((u) => u);

      await expect(service.claimOrCreateOnLogin(account)).rejects.toThrow(
        ForbiddenException,
      );
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          plexId: '555',
          plexUsername: 'someuser',
          role: UserRole.VIEWER,
          allowed: false,
        }),
      );
    });

    it('does not create a second access-request row on a repeat attempt from the same still-disabled account', async () => {
      const existing = { id: 3, plexId: '555', allowed: false } as User;
      (userRepo.findOneBy as jest.Mock).mockResolvedValueOnce(existing);

      await expect(service.claimOrCreateOnLogin(account)).rejects.toThrow(
        ForbiddenException,
      );
      expect(userRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('invite', () => {
    it('lowercases the invited username and defaults to unclaimed/allowed', async () => {
      (userRepo.save as jest.Mock).mockImplementation((u) => u);

      const result = await service.invite({
        plexUsername: 'MixedCase',
        role: UserRole.APPROVER,
      });

      expect(result).toEqual(
        expect.objectContaining({
          plexUsername: 'mixedcase',
          plexId: null,
          allowed: true,
          role: UserRole.APPROVER,
        }),
      );
    });
  });

  describe('count', () => {
    it('excludes break-glass rows - they never consume the first-login bootstrap slot', async () => {
      (userRepo.count as jest.Mock).mockResolvedValue(0);

      await service.count();

      const where = (userRepo.count as jest.Mock).mock.calls[0][0].where;
      expect(isNullOperator(where.passwordHash)).toBe(true);
    });
  });

  describe('upsertBreakGlassAdmin', () => {
    it('creates a new admin row when no account has that username yet', async () => {
      (userRepo.findOneBy as jest.Mock).mockResolvedValue(null);
      (userRepo.save as jest.Mock).mockImplementation((u) => u);

      await service.upsertBreakGlassAdmin('Recovery', 'hashed-value');

      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          plexUsername: 'recovery',
          plexId: null,
          role: UserRole.ADMIN,
          allowed: true,
          passwordHash: 'hashed-value',
        }),
      );
    });

    it('rotates the password hash on the existing break-glass row', async () => {
      (userRepo.findOneBy as jest.Mock).mockResolvedValue({
        id: 9,
        plexId: null,
        passwordHash: 'old-hash',
      });

      await service.upsertBreakGlassAdmin('recovery', 'new-hash');

      expect(userRepo.update).toHaveBeenCalledWith(
        { id: 9 },
        {
          passwordHash: 'new-hash',
          role: UserRole.ADMIN,
          allowed: true,
        },
      );
    });

    it('refuses to attach a password to an account already claimed by a colliding Plex username', async () => {
      (userRepo.findOneBy as jest.Mock).mockResolvedValue({
        id: 9,
        plexId: '999',
        passwordHash: null,
      });

      await service.upsertBreakGlassAdmin('recovery', 'new-hash');

      expect(userRepo.update).not.toHaveBeenCalled();
      expect(userRepo.save).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('verifyLocalLogin', () => {
    it('returns null when no account with that username has a password set', async () => {
      (userRepo.findOneBy as jest.Mock).mockResolvedValue(null);

      const result = await service.verifyLocalLogin('recovery', 'anything');

      expect(result).toBeNull();
    });

    it('returns null when the password is wrong', async () => {
      (userRepo.findOneBy as jest.Mock).mockResolvedValue({
        id: 9,
        passwordHash: hashPassword('correct-password'),
      });

      const result = await service.verifyLocalLogin(
        'recovery',
        'wrong-password',
      );

      expect(result).toBeNull();
      expect(userRepo.update).not.toHaveBeenCalled();
    });

    it('returns the user and records lastLoginAt on a correct password', async () => {
      (userRepo.findOneBy as jest.Mock)
        .mockResolvedValueOnce({
          id: 9,
          passwordHash: hashPassword('correct-password'),
        })
        .mockResolvedValueOnce({ id: 9, lastLoginAt: new Date() });

      const result = await service.verifyLocalLogin(
        'recovery',
        'correct-password',
      );

      expect(userRepo.update).toHaveBeenCalledWith(
        { id: 9 },
        { lastLoginAt: expect.any(Date) },
      );
      expect(result).toEqual(expect.objectContaining({ id: 9 }));
    });
  });
});
