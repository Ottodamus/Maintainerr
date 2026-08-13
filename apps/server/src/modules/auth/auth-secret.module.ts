import { Module } from '@nestjs/common';
import { AuthSecretService } from './auth-secret.service';

/**
 * Split out so JwtModule.registerAsync can import it and inject
 * AuthSecretService into its factory - a dynamic module's async factory can
 * only reach providers reachable through its own `imports`, not providers
 * declared on the module that happens to be importing the dynamic module.
 */
@Module({
  providers: [AuthSecretService],
  exports: [AuthSecretService],
})
export class AuthSecretModule {}
