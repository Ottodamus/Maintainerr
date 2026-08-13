import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import {
  SESSION_COOKIE_NAME,
  SessionTokenPayload,
} from '../../modules/auth/auth.constants';
import { MaintainerrLogger } from '../../modules/logging/logs.service';
import { AuthenticatedUser } from '../types/authenticated-user.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly logger: MaintainerrLogger,
  ) {
    this.logger.setContext(JwtAuthGuard.name);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
