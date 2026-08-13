import {
  PlexLoginCallbackDto,
  plexLoginCallbackSchema,
  UserRole,
} from '@maintainerr/contracts';
import {
  Body,
  Controller,
  HttpCode,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { ZodValidationPipe } from 'nestjs-zod';
import { MaintainerrLogger } from '../logging/logs.service';
import { UsersService } from '../users/users.service';
import {
  isSecureCookieEnabled,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  SessionTokenPayload,
} from './auth.constants';
import { PlexAuthService } from './plex-auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly plexAuthService: PlexAuthService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly logger: MaintainerrLogger,
  ) {
    this.logger.setContext(AuthController.name);
  }

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

    return user;
  }

  @Post('/logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(SESSION_COOKIE_NAME);
    return { success: true };
  }
}
