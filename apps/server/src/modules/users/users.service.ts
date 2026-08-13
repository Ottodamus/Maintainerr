import { InviteUserDto, UpdateUserDto, UserRole } from '@maintainerr/contracts';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PlexAccount } from '../auth/plex-auth.service';
import { MaintainerrLogger } from '../logging/logs.service';
import { User } from './entities/user.entities';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly logger: MaintainerrLogger,
  ) {
    this.logger.setContext(UsersService.name);
  }

  public findAll(): Promise<User[]> {
    return this.userRepo.find();
  }

  public findById(id: number): Promise<User | null> {
    return this.userRepo.findOneBy({ id });
  }

  public count(): Promise<number> {
    return this.userRepo.count();
  }

  public invite(dto: InviteUserDto): Promise<User> {
    const user = this.userRepo.create({
      plexId: null,
      plexUsername: dto.plexUsername.toLowerCase(),
      email: null,
      thumb: null,
      role: dto.role,
      allowed: true,
      lastLoginAt: null,
    });

    return this.userRepo.save(user);
  }

  public async updateUser(id: number, dto: UpdateUserDto): Promise<User> {
    await this.userRepo.update(
      { id },
      {
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.allowed !== undefined ? { allowed: dto.allowed } : {}),
      },
    );

    return (await this.findById(id))!;
  }

  /**
   * Resolves a logged-in Plex account to a local User, claiming an
   * admin-created invite (matched by username) on first login and
   * bootstrapping the very first person ever to log in as ADMIN. Throws
   * ForbiddenException when the account is neither invited nor first.
   */
  public async claimOrCreateOnLogin(account: PlexAccount): Promise<User> {
    const plexId = account.id.toString();
    const usernameLower = account.username.toLowerCase();

    const existing = await this.userRepo.findOneBy({ plexId });
    if (existing) {
      await this.userRepo.update(
        { id: existing.id },
        {
          plexUsername: usernameLower,
          email: account.email,
          thumb: account.thumb,
          lastLoginAt: new Date(),
        },
      );
      return (await this.findById(existing.id))!;
    }

    const invited = await this.userRepo.findOneBy({
      plexId: IsNull(),
      plexUsername: usernameLower,
      allowed: true,
    });
    if (invited) {
      await this.userRepo.update(
        { id: invited.id },
        {
          plexId,
          email: account.email,
          thumb: account.thumb,
          lastLoginAt: new Date(),
        },
      );
      return (await this.findById(invited.id))!;
    }

    const isFirstUser = (await this.count()) === 0;
    if (isFirstUser) {
      this.logger.log(`Bootstrapping first login (${usernameLower}) as ADMIN.`);
      const admin = this.userRepo.create({
        plexId,
        plexUsername: usernameLower,
        email: account.email,
        thumb: account.thumb,
        role: UserRole.ADMIN,
        allowed: true,
        lastLoginAt: new Date(),
      });
      return this.userRepo.save(admin);
    }

    throw new ForbiddenException(
      'This Plex account is not allowed to access Maintainerr. Ask an admin to invite you.',
    );
  }
}
