import { UserRole } from '@maintainerr/contracts';

export const SESSION_COOKIE_NAME = 'maintainerr_session';

export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const SESSION_JWT_EXPIRES_IN = '30d';

export interface SessionTokenPayload {
  sub: number;
  role: UserRole;
}

/**
 * Whether the session cookie should be marked `secure` (HTTPS-only). Off by
 * default: many homelab deployments terminate TLS at a reverse proxy
 * (Cloudflare Tunnel, Tailscale) and reach Maintainerr itself over plain
 * HTTP, where a `secure` cookie would silently never be sent. Set
 * COOKIE_SECURE=true when Maintainerr itself is reached directly over HTTPS.
 */
export const isSecureCookieEnabled = (): boolean =>
  process.env.COOKIE_SECURE === 'true';
