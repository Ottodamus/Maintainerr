import {
  LocalLoginDto,
  localLoginSchema,
  PlexLoginCallbackDto,
  plexLoginCallbackSchema,
  UserRole,
} from '@maintainerr/contracts';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { ZodValidationPipe } from 'nestjs-zod';
import { Public } from '../../common/decorators/public.decorator';
import { MaintainerrLogger } from '../logging/logs.service';
import { SettingsDataService } from '../settings/settings-data.service';
import { User } from '../users/entities/user.entities';
import { toUserDto } from '../users/user.mapper';
import { UsersService } from '../users/users.service';
import {
  isSecureCookieEnabled,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  SessionTokenPayload,
} from './auth.constants';
import { LocalLoginRateLimiter } from './local-login-rate-limiter';
import { PlexAuthService } from './plex-auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly plexAuthService: PlexAuthService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly settingsDataService: SettingsDataService,
    private readonly localLoginRateLimiter: LocalLoginRateLimiter,
    private readonly logger: MaintainerrLogger,
  ) {
    this.logger.setContext(AuthController.name);
  }

  /**
   * The Plex OAuth popup needs this device identifier before any session
   * exists, so it can't come from the (now auth-gated) full settings
   * payload - this is the one non-secret field it actually needs.
   */
  @Public()
  @Get('/client-id')
  getClientId() {
    return { clientId: this.settingsDataService.clientId };
  }

  @Public()
  @Post('/plex/callback')
  @HttpCode(200)
  async plexCallback(
    @Body(new ZodValidationPipe(plexLoginCallbackSchema))
    payload: PlexLoginCallbackDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const account = await this.plexAuthService.getAccount(payload.authToken);
    if (!account) {
      throw new UnauthorizedException('Could not verify Plex account');
    }

    const user = await this.usersService.claimOrCreateOnLogin(account);
    await this.issueSession(user, response);

    return toUserDto(user);
  }

  /**
   * Break-glass login: only ever matches the one account
   * BreakGlassService configures from BREAK_GLASS_USERNAME/
   * BREAK_GLASS_PASSWORD, so this stays unreachable unless that's set up.
   */
  @Public()
  @Post('/local/login')
  @HttpCode(200)
  async localLogin(
    @Body(new ZodValidationPipe(localLoginSchema)) payload: LocalLoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const usernameKey = payload.username.toLowerCase();
    if (this.localLoginRateLimiter.isLocked(usernameKey)) {
      throw new UnauthorizedException(
        'Too many failed attempts. Try again later.',
      );
    }

    const user = await this.usersService.verifyLocalLogin(
      payload.username,
      payload.password,
    );
    if (!user) {
      this.localLoginRateLimiter.recordFailure(usernameKey);
      throw new UnauthorizedException('Invalid username or password');
    }

    this.localLoginRateLimiter.recordSuccess(usernameKey);
    await this.issueSession(user, response);

    return toUserDto(user);
  }

  @Public()
  @Post('/logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(SESSION_COOKIE_NAME);
    return { success: true };
  }

  private async issueSession(user: User, response: Response) {
    const tokenPayload: SessionTokenPayload = {
      sub: user.id,
      role: user.role as UserRole,
    };
    const token = await this.jwtService.signAsync(tokenPayload);

    response.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecureCookieEnabled(),
      maxAge: SESSION_MAX_AGE_MS,
    });
  }
}
