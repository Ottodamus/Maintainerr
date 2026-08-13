import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { dataDir } from '../../app/config/dataDir';
import { MaintainerrLogger } from '../logging/logs.service';

const SECRET_FILE_NAME = '.auth-secret';

/**
 * Owns the signing secret for session JWTs. Deliberately independent of the
 * Settings entity/DB: JwtModule needs the secret synchronously while the
 * module graph is being built, before SettingsDataService.init() (which runs
 * from AppModule's onModuleInit, after other modules are already wired) has
 * necessarily hydrated. A plain file in the data directory sidesteps that
 * ordering question entirely. JWT_SECRET overrides it when set.
 */
@Injectable()
export class AuthSecretService {
  constructor(private readonly logger: MaintainerrLogger) {
    this.logger.setContext(AuthSecretService.name);
  }

  public getSecret(): string {
    const envSecret = process.env.JWT_SECRET?.trim();
    if (envSecret) {
      return envSecret;
    }

    const secretPath = path.join(dataDir, SECRET_FILE_NAME);

    try {
      const existing = fs.readFileSync(secretPath, 'utf-8').trim();
      if (existing) {
        return existing;
      }
    } catch (error) {
      this.logger.debug(error);
    }

    const generated = randomBytes(48).toString('hex');
    fs.writeFileSync(secretPath, generated, { mode: 0o600 });
    this.logger.log('Generated a new session auth secret.');
    return generated;
  }
}
