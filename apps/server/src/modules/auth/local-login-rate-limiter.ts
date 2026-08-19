import { Injectable } from '@nestjs/common';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

interface AttemptRecord {
  count: number;
  windowStart: number;
}

/**
 * In-memory only (a restart clears it, which is fine - it's a soft
 * anti-brute-force measure, not a security boundary on its own). Keyed by
 * username rather than IP: the break-glass account may be reachable through
 * a shared tunnel egress, where IP-based limiting would either do nothing or
 * lock out everyone behind it.
 */
@Injectable()
export class LocalLoginRateLimiter {
  private readonly attempts = new Map<string, AttemptRecord>();

  isLocked(username: string): boolean {
    const record = this.attempts.get(username);
    if (!record) {
      return false;
    }

    if (Date.now() - record.windowStart > WINDOW_MS) {
      this.attempts.delete(username);
      return false;
    }

    return record.count >= MAX_ATTEMPTS;
  }

  recordFailure(username: string): void {
    const now = Date.now();
    const record = this.attempts.get(username);

    if (!record || now - record.windowStart > WINDOW_MS) {
      this.attempts.set(username, { count: 1, windowStart: now });
      return;
    }

    record.count += 1;
  }

  recordSuccess(username: string): void {
    this.attempts.delete(username);
  }
}
