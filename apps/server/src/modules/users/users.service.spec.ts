import { UserRole } from '@maintainerr/contracts';
import { ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PlexAccount } from '../auth/plex-auth.service';
import { MaintainerrLogger } from '../logging/logs.service';
import { User } from './entities/user.entities';
import { UsersService } from './users.service';

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
      const existing = { id: 1, plexId: '555' } as User;
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

    it('rejects an uninvited account once at least one user already exists', async () => {
      (userRepo.findOneBy as jest.Mock).mockResolvedValue(null);
      (userRepo.count as jest.Mock).mockResolvedValue(1);

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
});
