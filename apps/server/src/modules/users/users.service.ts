import { InviteUserDto, UpdateUserDto, UserRole } from '@maintainerr/contracts';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { PlexAccount } from '../auth/plex-auth.service';
import { verifyPassword } from '../auth/password-hash.util';
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

  // Excludes the break-glass account: it isn't a person who needs an invite,
  // so it must never consume the "first login becomes ADMIN" bootstrap slot.
  public count(): Promise<number> {
    return this.userRepo.count({ where: { passwordHash: IsNull() } });
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
   * bootstrapping the very first person ever to log in as ADMIN. When the
   * account is neither invited nor first, it self-registers a disabled
   * access-request row (we now know their real Plex identity, so there's no
   * need to make them type a username separately) and throws
   * ForbiddenException either way - an existing-but-disabled row (whether
   * still pending review or explicitly revoked by an admin) never gets a
   * session, matching an admin-created invite's `allowed` gate.
   */
  public async claimOrCreateOnLogin(account: PlexAccount): Promise<User> {
    const plexId = account.id.toString();
    const usernameLower = account.username.toLowerCase();

    const existing = await this.userRepo.findOneBy({ plexId });
    if (existing) {
      if (!existing.allowed) {
        throw new ForbiddenException(
          'This Plex account does not have access to Maintainerr yet. Ask an admin to approve it.',
        );
      }

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
      // A break-glass row must never be claimable via Plex, even if its
      // reserved username happens to collide with a real Plex username.
      passwordHash: IsNull(),
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

    this.logger.log(`Recording an access request from "${usernameLower}".`);
    const requested = this.userRepo.create({
      plexId,
      plexUsername: usernameLower,
      email: account.email,
      thumb: account.thumb,
      role: UserRole.VIEWER,
      allowed: false,
      lastLoginAt: null,
    });
    await this.userRepo.save(requested);

    throw new ForbiddenException(
      'Access requested. An admin needs to approve you before you can sign in.',
    );
  }

  /**
   * Upserts the single break-glass admin account from
   * BREAK_GLASS_USERNAME/BREAK_GLASS_PASSWORD on every boot, so rotating the
   * password is just changing the env var and redeploying. Refuses to touch
   * a row that's already claimed by a real Plex account (plexId set) -
   * rather than silently grafting a password onto someone else's account
   * because their Plex username happened to collide with the chosen
   * break-glass username.
   */
  public async upsertBreakGlassAdmin(
    username: string,
    passwordHash: string,
  ): Promise<void> {
    const usernameLower = username.toLowerCase();
    const existing = await this.userRepo.findOneBy({
      plexUsername: usernameLower,
    });

    if (existing) {
      if (existing.plexId !== null) {
        this.logger.warn(
          `BREAK_GLASS_USERNAME "${usernameLower}" collides with an existing Plex-linked account - refusing to attach a password to it. Choose a different break-glass username.`,
        );
        return;
      }

      await this.userRepo.update(
        { id: existing.id },
        { passwordHash, role: UserRole.ADMIN, allowed: true },
      );
      return;
    }

    const breakGlassAdmin = this.userRepo.create({
      plexId: null,
      plexUsername: usernameLower,
      email: null,
      thumb: null,
      role: UserRole.ADMIN,
      allowed: true,
      lastLoginAt: null,
      passwordHash,
    });
    await this.userRepo.save(breakGlassAdmin);
  }

  /**
   * Verifies the break-glass account's username/password. Only ever matches
   * a row that has a passwordHash - a Plex-invited user can never log in
   * this way, even if they somehow knew a password.
   */
  public async verifyLocalLogin(
    username: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.userRepo.findOneBy({
      plexUsername: username.toLowerCase(),
      passwordHash: Not(IsNull()),
    });

    if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return null;
    }

    await this.userRepo.update({ id: user.id }, { lastLoginAt: new Date() });
    return (await this.findById(user.id))!;
  }
}
