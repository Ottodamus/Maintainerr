import { Application, MediaServerType } from '@maintainerr/contracts';
import { Settings } from '../../settings/entities/settings.entities';
import { unavailableRuleApplications } from './rule-application-availability.helper';

const allConfigured = {
  media_server_type: MediaServerType.PLEX,
  seerr_url: 'http://seerr',
  seerr_api_key: 'key',
  tautulli_url: 'http://tautulli',
  tautulli_api_key: 'key',
  streamystats_url: 'http://streamystats',
  jellyfin_api_key: 'key',
  tracearr_url: 'http://tracearr',
  tracearr_api_key: 'key',
  tracearr_server_id: 'server',
} as Settings;

const servarr = { radarr: true, sonarr: true, sportarr: true };

describe('unavailableRuleApplications', () => {
  it('reports only the wrong-server companion when everything is set up', () => {
    // Streamystats is configured but this is a Plex server. Plex Mirror
    // Sites is unavailable too since hasMirrorSites defaults to false here.
    expect(unavailableRuleApplications(allConfigured, servarr)).toEqual([
      Application.PLEX_MIRROR,
      Application.STREAMYSTATS,
    ]);
  });

  // Migration carries companion operands over on purpose, so a configured
  // Tautulli can end up on a Jellyfin server, where its ids are the other
  // server's and every item fails. The editor already hides it; the server has
  // to agree.
  it.each([
    [MediaServerType.PLEX, Application.STREAMYSTATS, Application.TAUTULLI],
    [MediaServerType.JELLYFIN, Application.TAUTULLI, Application.STREAMYSTATS],
    [MediaServerType.EMBY, Application.TAUTULLI, undefined],
  ])('on %s reports %s as unavailable', (server, unavailable, available) => {
    const result = unavailableRuleApplications(
      { ...allConfigured, media_server_type: server } as Settings,
      servarr,
    );

    expect(result).toContain(unavailable);
    if (available !== undefined) {
      expect(result).not.toContain(available);
    }
  });

  it('reports both companions on Emby, which has neither', () => {
    const result = unavailableRuleApplications(
      { ...allConfigured, media_server_type: MediaServerType.EMBY } as Settings,
      servarr,
    );

    expect(result).toEqual(
      expect.arrayContaining([Application.TAUTULLI, Application.STREAMYSTATS]),
    );
  });

  it.each([
    ['Seerr', { seerr_api_key: null }, Application.SEERR],
    ['Tautulli', { tautulli_url: null }, Application.TAUTULLI],
    ['Streamystats', { streamystats_url: null }, Application.STREAMYSTATS],
    ['Tracearr', { tracearr_server_id: null }, Application.TRACEARR],
  ])(
    'reports %s when its settings are incomplete',
    (label, patch, expected) => {
      const result = unavailableRuleApplications(
        { ...allConfigured, ...patch } as Settings,
        servarr,
      );

      expect(result).toContain(expected);
    },
  );

  it.each([
    ['radarr', Application.RADARR],
    ['sonarr', Application.SONARR],
    ['sportarr', Application.SPORTARR],
  ])('reports %s when no instance exists', (key, expected) => {
    const result = unavailableRuleApplications(allConfigured, {
      ...servarr,
      [key]: false,
    });

    expect(result).toContain(expected);
  });

  // A fresh install has no settings row yet. Reporting everything as missing
  // would fail every rule group before the user can configure anything.
  it('reports nothing when there are no settings at all', () => {
    expect(unavailableRuleApplications(null, servarr)).toEqual([]);
  });

  describe('Plex Mirror Sites', () => {
    it('is unavailable by default (hasMirrorSites omitted)', () => {
      expect(unavailableRuleApplications(allConfigured, servarr)).toContain(
        Application.PLEX_MIRROR,
      );
    });

    it('is unavailable when explicitly false, even on Plex', () => {
      const result = unavailableRuleApplications(allConfigured, servarr, false);

      expect(result).toContain(Application.PLEX_MIRROR);
    });

    it('is available when mirror sites exist and the server is Plex', () => {
      const result = unavailableRuleApplications(allConfigured, servarr, true);

      expect(result).not.toContain(Application.PLEX_MIRROR);
    });

    it('stays unavailable on a non-Plex server even with mirror sites configured', () => {
      const result = unavailableRuleApplications(
        {
          ...allConfigured,
          media_server_type: MediaServerType.JELLYFIN,
        } as Settings,
        servarr,
        true,
      );

      expect(result).toContain(Application.PLEX_MIRROR);
    });
  });
});
