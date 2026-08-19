import { Injectable, OnModuleInit } from '@nestjs/common';
import { MaintainerrLogger } from '../logging/logs.service';
import { UsersService } from '../users/users.service';
import { hashPassword } from './password-hash.util';

/**
 * Configures (or reconfigures) the one break-glass admin account on every
 * boot from BREAK_GLASS_USERNAME/BREAK_GLASS_PASSWORD, so it keeps working
 * even if Plex OAuth itself is unreachable. Both env vars must be set - if
 * either is missing, no local login exists.
 */
@Injectable()
export class BreakGlassService implements OnModuleInit {
  constructor(
    private readonly usersService: UsersService,
    private readonly logger: MaintainerrLogger,
  ) {
    this.logger.setContext(BreakGlassService.name);
  }

  async onModuleInit() {
    const username = process.env.BREAK_GLASS_USERNAME?.trim();
    const password = process.env.BREAK_GLASS_PASSWORD;

    if (!username || !password) {
      return;
    }

    await this.usersService.upsertBreakGlassAdmin(
      username,
      hashPassword(password),
    );
    this.logger.log(`Break-glass admin account "${username}" is configured.`);
  }
}
