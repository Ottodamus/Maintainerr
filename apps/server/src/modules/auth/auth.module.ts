import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthSecretModule } from './auth-secret.module';
import { AuthSecretService } from './auth-secret.service';
import { AuthController } from './auth.controller';
import { SESSION_JWT_EXPIRES_IN } from './auth.constants';
import { PlexAuthService } from './plex-auth.service';

/**
 * Global so JwtService (needed by JwtAuthGuard, used from any controller) is
 * injectable without every module importing AuthModule directly - mirrors
 * SettingsModule/LogsModule.
 */
@Global()
@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      imports: [AuthSecretModule],
      useFactory: (authSecretService: AuthSecretService) => ({
        secret: authSecretService.getSecret(),
        signOptions: { expiresIn: SESSION_JWT_EXPIRES_IN },
      }),
      inject: [AuthSecretService],
    }),
  ],
  providers: [PlexAuthService],
  controllers: [AuthController],
  exports: [JwtModule],
})
export class AuthModule {}
