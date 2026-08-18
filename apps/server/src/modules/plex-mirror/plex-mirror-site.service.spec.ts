import { getRepositoryToken } from '@nestjs/typeorm';
import { Mocked, TestBed } from '@suites/unit';
import axios from 'axios';
import { Repository } from 'typeorm';
import { PlexMirrorSite } from './entities/plex-mirror-site.entities';
import {
  parsePlexUrl,
  PlexMirrorSiteService,
} from './plex-mirror-site.service';

jest.mock('axios');
// httpRetry.ts builds a shared retrying axios instance at module load
// (rateLimitAwareHttp) via the real axios-retry - which reads
// instance.interceptors and crashes once axios.create() is auto-mocked to
// return undefined. Neutralize it the same way plexApi.spec.ts does.
jest.mock('axios-retry', () => ({
  __esModule: true,
  default: jest.fn(),
  exponentialDelay: jest.fn(),
}));

describe('parsePlexUrl', () => {
  it('defaults to port 80 for http with no explicit port', () => {
    expect(parsePlexUrl('http://10.0.0.5')).toEqual({
      hostname: '10.0.0.5',
      port: 80,
      https: false,
    });
  });

  it('defaults to port 443 for https with no explicit port', () => {
    expect(parsePlexUrl('https://plex.example.com')).toEqual({
      hostname: 'plex.example.com',
      port: 443,
      https: true,
    });
  });

  it('respects an explicit port', () => {
    expect(parsePlexUrl('http://10.0.0.5:32400')).toEqual({
      hostname: '10.0.0.5',
      port: 32400,
      https: false,
    });
  });
});

describe('PlexMirrorSiteService', () => {
  let service: PlexMirrorSiteService;
  let repo: Mocked<Repository<PlexMirrorSite>>;

  beforeEach(async () => {
    const { unit, unitRef } = await TestBed.solitary(
      PlexMirrorSiteService,
    ).compile();

    service = unit;
    repo = unitRef.get(getRepositoryToken(PlexMirrorSite) as string);

    jest.clearAllMocks();
  });

  describe('add', () => {
    it('saves the site and returns it', async () => {
      const saved = {
        id: 1,
        siteName: 'Site A',
        url: 'http://10.0.0.5:32400',
        token: 'tok',
        librarySectionId: '1',
      } as PlexMirrorSite;
      (repo.save as jest.Mock).mockResolvedValue(saved);

      const result = await service.add({
        siteName: 'Site A',
        url: 'http://10.0.0.5:32400',
        token: 'tok',
        librarySectionId: '1',
      });

      expect(result).toEqual({
        data: saved,
        status: 'OK',
        code: 1,
        message: 'Success',
      });
    });

    it('returns NOK on a save failure', async () => {
      (repo.save as jest.Mock).mockRejectedValue(new Error('db locked'));

      const result = await service.add({
        siteName: 'Site A',
        url: 'http://10.0.0.5:32400',
        token: 'tok',
        librarySectionId: '1',
      });

      expect(result).toEqual({ status: 'NOK', code: 0, message: 'Failure' });
    });
  });

  describe('delete', () => {
    it('deletes by id', async () => {
      const result = await service.delete(5);

      expect(repo.delete).toHaveBeenCalledWith({ id: 5 });
      expect(result).toEqual({ status: 'OK', code: 1, message: 'Success' });
    });
  });

  describe('testConnection', () => {
    it('reports OK when Plex answers /identity with a MediaContainer', async () => {
      (axios.create as jest.Mock).mockReturnValue({
        request: jest.fn().mockResolvedValue({ data: { MediaContainer: {} } }),
        defaults: {},
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
      });

      const result = await service.testConnection({
        url: 'http://10.0.0.5:32400',
        token: 'tok',
      });

      expect(result).toEqual({ status: 'OK', code: 1, message: 'Success' });
    });

    it('reports NOK when the request fails', async () => {
      (axios.create as jest.Mock).mockReturnValue({
        request: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
        defaults: {},
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
      });

      const result = await service.testConnection({
        url: 'http://10.0.0.5:32400',
        token: 'tok',
      });

      expect(result.status).toBe('NOK');
      expect(result.code).toBe(0);
    });
  });
});
