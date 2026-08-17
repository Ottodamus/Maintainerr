import {
  BasicResponseDto,
  PlexMirrorSiteSetting,
} from '@maintainerr/contracts';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import PlexApi from '../api/lib/plexApi';
import {
  CONNECTION_TEST_TIMEOUT_MS,
  formatConnectionFailureMessage,
  getErrorMessage,
  logConnectionTestError,
} from '../../utils/connection-error';
import { MaintainerrLogger } from '../logging/logs.service';
import {
  PlexMirrorSiteDto,
  PlexMirrorSiteRawDto,
  PlexMirrorSiteResponseDto,
} from "./dto's/plex-mirror-site.dto";
import { PlexMirrorSite } from './entities/plex-mirror-site.entities';

interface ParsedPlexUrl {
  hostname: string;
  port: number;
  https: boolean;
}

// Plex's own low-level client wants hostname/port/https split out, while the
// stored setting (like every other service URL in this app) is one string.
export const parsePlexUrl = (url: string): ParsedPlexUrl => {
  const parsed = new URL(url);
  const https = parsed.protocol === 'https:';
  const port = parsed.port ? Number(parsed.port) : https ? 443 : 80;

  return { hostname: parsed.hostname, port, https };
};

@Injectable()
export class PlexMirrorSiteService {
  constructor(
    @InjectRepository(PlexMirrorSite)
    private readonly plexMirrorSiteRepo: Repository<PlexMirrorSite>,
    private readonly logger: MaintainerrLogger,
  ) {
    this.logger.setContext(PlexMirrorSiteService.name);
  }

  public getAll(): Promise<PlexMirrorSite[]> {
    return this.plexMirrorSiteRepo.find();
  }

  public getOne(id: number): Promise<PlexMirrorSite | null> {
    return this.plexMirrorSiteRepo.findOne({ where: { id } });
  }

  public async add(
    settings: PlexMirrorSiteRawDto,
  ): Promise<PlexMirrorSiteResponseDto> {
    try {
      const saved = await this.plexMirrorSiteRepo.save(settings);
      this.logger.log(`Plex mirror site '${saved.siteName}' added`);
      return {
        data: saved,
        status: 'OK',
        code: 1,
        message: 'Success',
      };
    } catch (error) {
      this.logger.error('Error while adding Plex mirror site');
      this.logger.debug(error);
      return { status: 'NOK', code: 0, message: 'Failure' };
    }
  }

  public async update(
    settings: PlexMirrorSiteDto,
  ): Promise<PlexMirrorSiteResponseDto> {
    try {
      const existing = await this.plexMirrorSiteRepo.findOne({
        where: { id: settings.id },
      });
      const data = { ...existing, ...settings };
      await this.plexMirrorSiteRepo.save(data);

      this.logger.log(`Plex mirror site '${settings.siteName}' updated`);
      return { data, status: 'OK', code: 1, message: 'Success' };
    } catch (error) {
      this.logger.error('Error while updating Plex mirror site');
      this.logger.debug(error);
      return { status: 'NOK', code: 0, message: 'Failure' };
    }
  }

  public async delete(id: number): Promise<BasicResponseDto> {
    try {
      await this.plexMirrorSiteRepo.delete({ id });
      this.logger.log(`Plex mirror site ${id} deleted`);
      return { status: 'OK', code: 1, message: 'Success' };
    } catch (error) {
      this.logger.error(`Error while deleting Plex mirror site ${id}`);
      this.logger.debug(error);
      return {
        status: 'NOK',
        code: 0,
        message: getErrorMessage(error, 'Failed to delete mirror site'),
      };
    }
  }

  /**
   * Reachability check for a not-yet-saved (or being-edited) mirror site,
   * mirroring testRadarr/testSonarr - but talking to a throwaway PlexApi
   * client built from the submitted connection details, never the primary
   * server's own PlexApiService singleton (see rediscoverConnection/
   * getPlexServers in plex-api.service.ts for the same ad-hoc-client
   * pattern this copies).
   */
  public async testConnection(
    payload: Pick<PlexMirrorSiteSetting, 'url' | 'token'>,
  ): Promise<BasicResponseDto> {
    try {
      const { hostname, port, https } = parsePlexUrl(payload.url);
      const client = new PlexApi({
        hostname,
        port,
        https,
        token: payload.token,
        timeout: CONNECTION_TEST_TIMEOUT_MS,
      });

      const status = await client.query<{ MediaContainer?: unknown }>(
        { uri: '/identity' },
        false,
      );

      return status?.MediaContainer
        ? { status: 'OK', code: 1, message: 'Success' }
        : { status: 'NOK', code: 0, message: 'Unexpected response from Plex' };
    } catch (error) {
      logConnectionTestError(this.logger, 'Plex mirror site');
      return {
        status: 'NOK',
        code: 0,
        message: formatConnectionFailureMessage(
          error,
          'Failed to connect to the mirror site. Verify URL and token.',
        ),
      };
    }
  }
}
