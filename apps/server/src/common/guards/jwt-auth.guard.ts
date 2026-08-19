import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import {
  SESSION_COOKIE_NAME,
  SessionTokenPayload,
} from '../../modules/auth/auth.constants';
import { MaintainerrLogger } from '../../modules/logging/logs.service';
import { AuthenticatedUser } from '../types/authenticated-user.interface';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Registered globally (APP_GUARD in AppModule) so every route requires a
 * session by default. Routes that must stay reachable pre-login - the login
 * flow itself and health checks - opt out with @Public().
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly logger: MaintainerrLogger,
    private readonly reflector: Reflector,
  ) {
    this.logger.setContext(JwtAuthGuard.name);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedUser }>();
    const token = request.cookies?.[SESSION_COOKIE_NAME];

    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('Not authenticated');
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<SessionTokenPayload>(token);
      request.user = { id: payload.sub, role: payload.role };
      return true;
    } catch (error) {
      this.logger.debug(error);
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}
