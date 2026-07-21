import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  clearAuthReturnTo,
  consumeAuthReturnTo,
  eventDetailBackTo,
  isSafeReturnPath,
  sanitizeReferrer,
  saveAuthReturnTo,
} from './returnTo';

function mockSessionStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  });
}

describe('isSafeReturnPath', () => {
  it('allows known app routes', () => {
    expect(isSafeReturnPath('/')).toBe(true);
    expect(isSafeReturnPath('/my-events')).toBe(true);
    expect(isSafeReturnPath('/leaderboard')).toBe(true);
    expect(isSafeReturnPath('/event/abc')).toBe(true);
    expect(isSafeReturnPath('/create?edit=x')).toBe(true);
    expect(isSafeReturnPath('/profile')).toBe(true);
  });

  it('blocks auth, sign-in, unknown routes, and open redirects', () => {
    expect(isSafeReturnPath('/auth/callback')).toBe(false);
    expect(isSafeReturnPath('/sign-in')).toBe(false);
    expect(isSafeReturnPath('/foo/bar')).toBe(false);
    expect(isSafeReturnPath('//evil.com')).toBe(false);
    expect(isSafeReturnPath('https://evil.com')).toBe(false);
  });
});

describe('auth returnTo session', () => {
  beforeEach(() => {
    mockSessionStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('round-trips a saved path with query', () => {
    saveAuthReturnTo('/create?edit=ev-1');
    expect(consumeAuthReturnTo('/')).toBe('/create?edit=ev-1');
    expect(consumeAuthReturnTo('/')).toBe('/');
  });

  it('ignores unsafe saved paths', () => {
    sessionStorage.setItem('forza.auth_return_to', '/auth/callback');
    expect(consumeAuthReturnTo('/')).toBe('/');
  });

  it('clears stored return path', () => {
    saveAuthReturnTo('/event/ev-1');
    clearAuthReturnTo();
    expect(consumeAuthReturnTo('/')).toBe('/');
  });
});

describe('sanitizeReferrer', () => {
  it('returns pathname for safe paths with query', () => {
    expect(sanitizeReferrer('/my-events?tab=1')).toBe('/my-events');
  });

  it('returns undefined for unsafe paths', () => {
    expect(sanitizeReferrer('/foo/bar')).toBeUndefined();
  });
});

describe('eventDetailBackTo', () => {
  it('prefers referrer when safe', () => {
    expect(eventDetailBackTo('/my-events', {isDraft: false, isHost: false})).toBe('/my-events');
  });

  it('falls back when referrer is unsafe', () => {
    expect(eventDetailBackTo('/foo/bar', {isDraft: false, isHost: false})).toBe('/');
  });

  it('falls back for draft host', () => {
    expect(eventDetailBackTo(undefined, {isDraft: true, isHost: true})).toBe('/my-events');
  });

  it('falls back to browse', () => {
    expect(eventDetailBackTo(undefined, {isDraft: false, isHost: false})).toBe('/');
  });
});
