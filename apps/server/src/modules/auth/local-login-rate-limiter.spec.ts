import { LocalLoginRateLimiter } from './local-login-rate-limiter';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

describe('LocalLoginRateLimiter', () => {
  let limiter: LocalLoginRateLimiter;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    limiter = new LocalLoginRateLimiter();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows a username with no prior failures', () => {
    expect(limiter.isLocked('recovery')).toBe(false);
  });

  it('stays unlocked below the failure threshold', () => {
    for (let i = 0; i < MAX_ATTEMPTS - 1; i += 1) {
      limiter.recordFailure('recovery');
    }

    expect(limiter.isLocked('recovery')).toBe(false);
  });

  it('locks out once the failure threshold is reached', () => {
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
      limiter.recordFailure('recovery');
    }

    expect(limiter.isLocked('recovery')).toBe(true);
  });

  it('does not lock out an unrelated username', () => {
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
      limiter.recordFailure('recovery');
    }

    expect(limiter.isLocked('someone-else')).toBe(false);
  });

  it('unlocks again once the window elapses', () => {
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
      limiter.recordFailure('recovery');
    }

    jest.setSystemTime(WINDOW_MS + 1);

    expect(limiter.isLocked('recovery')).toBe(false);
  });

  it('clears the record on a success, so a later failure starts a fresh window', () => {
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
      limiter.recordFailure('recovery');
    }
    limiter.recordSuccess('recovery');

    expect(limiter.isLocked('recovery')).toBe(false);

    for (let i = 0; i < MAX_ATTEMPTS - 1; i += 1) {
      limiter.recordFailure('recovery');
    }
    expect(limiter.isLocked('recovery')).toBe(false);
  });
});
