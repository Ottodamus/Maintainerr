import { Injectable } from '@nestjs/common';
import axios, { isAxiosError } from 'axios';
import { SettingsDataService } from '../settings/settings-data.service';
import { MaintainerrLogger } from '../logging/logs.service';

export interface PlexAccount {
  id: number;
  username: string;
  email: string | null;
  thumb: string | null;
}

interface PlexTvUserResponse {
  id: number;
  username: string;
  email?: string | null;
  thumb?: string | null;
}

/**
 * Resolves a Plex account from a PIN-flow authToken. Deliberately separate
 * from PlexApiService/plexTvClient, which are bound to the single configured
 * media server's own stored token - here the token belongs to whichever
 * person is logging in, which may be a different Plex account entirely.
 */
@Injectable()
export class PlexAuthService {
  constructor(
    private readonly settingsDataService: SettingsDataService,
    private readonly logger: MaintainerrLogger,
  ) {
    this.logger.setContext(PlexAuthService.name);
  }

  public async getAccount(authToken: string): Promise<PlexAccount | undefined> {
    try {
      const { data } = await axios.get<PlexTvUserResponse>(
        'https://plex.tv/api/v2/user',
        {
          headers: {
            Accept: 'application/json',
            'X-Plex-Token': authToken,
            'X-Plex-Client-Identifier': this.settingsDataService.clientId,
          },
        },
      );

      return {
        id: data.id,
        username: data.username,
        email: data.email ?? null,
        thumb: data.thumb ?? null,
      };
    } catch (error) {
      if (isAxiosError(error)) {
        this.logger.warn(
          `Outbound call to plex.tv failed resolving account from authToken (${error.response?.status ?? 'no response'})`,
        );
      } else {
        this.logger.warn(
          'Outbound call to plex.tv failed resolving account from authToken',
        );
      }
      this.logger.debug(error);
      return undefined;
    }
  }
}
