import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  clearDiscordSession,
  expiresAtFromExpiresIn,
  loadDiscordSession,
  saveDiscordSession,
  sessionNeedsRefresh,
} from '../src/lib/discordAuth';
import {GUEST_USER} from '../src/lib/guestUser';

const TOKEN_KEY = 'forza_discord_access_token';
const REFRESH_KEY = 'forza_discord_refresh_token';
const EXPIRES_KEY = 'forza_discord_token_expires_at';
const USER_KEY = 'forza_discord_user';

function createStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe('discordAuth session persistence', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorage());
    vi.stubGlobal('sessionStorage', createStorage());
  });

  afterEach(() => {
    clearDiscordSession();
    vi.unstubAllGlobals();
  });

  it('stores browser session in localStorage', () => {
    const user = {...GUEST_USER, discordId: 'u1', username: 'driver'};
    saveDiscordSession({accessToken: 'tok', user});

    expect(localStorage.getItem(TOKEN_KEY)).toBe('tok');
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(loadDiscordSession()?.accessToken).toBe('tok');
  });

  it('migrates legacy sessionStorage entries to localStorage', () => {
    const user = {...GUEST_USER, discordId: 'u2', username: 'racer'};
    sessionStorage.setItem(TOKEN_KEY, 'legacy-tok');
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));

    const session = loadDiscordSession();
    expect(session?.accessToken).toBe('legacy-tok');
    expect(localStorage.getItem(TOKEN_KEY)).toBe('legacy-tok');
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('persists refresh token and expiry', () => {
    const user = {...GUEST_USER, discordId: 'u3', username: 'host'};
    const expiresAt = expiresAtFromExpiresIn(604800, 1_000_000);
    saveDiscordSession({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresAt,
      user,
    });

    const session = loadDiscordSession();
    expect(session?.refreshToken).toBe('refresh');
    expect(session?.expiresAt).toBe(expiresAt);
    expect(localStorage.getItem(REFRESH_KEY)).toBe('refresh');
    expect(localStorage.getItem(EXPIRES_KEY)).toBe(String(expiresAt));
  });

  it('preserves refresh token when profile patch omits it', () => {
    const user = {...GUEST_USER, discordId: 'u4', username: 'patch'};
    saveDiscordSession({
      accessToken: 'access',
      refreshToken: 'keep-me',
      expiresAt: 9_000_000,
      user,
    });
    saveDiscordSession({
      accessToken: 'access',
      user: {...user, xboxGamertag: 'Tag'},
    });

    const session = loadDiscordSession();
    expect(session?.refreshToken).toBe('keep-me');
    expect(session?.expiresAt).toBe(9_000_000);
    expect(session?.user.xboxGamertag).toBe('Tag');
  });

  it('sessionNeedsRefresh respects skew and missing refresh', () => {
    expect(sessionNeedsRefresh({expiresAt: Date.now() + 60_000}, Date.now())).toBe(false);
    expect(
      sessionNeedsRefresh(
        {refreshToken: 'r', expiresAt: Date.now() + 30_000},
        Date.now(),
        60_000,
      ),
    ).toBe(true);
    expect(
      sessionNeedsRefresh(
        {refreshToken: 'r', expiresAt: Date.now() + 120_000},
        Date.now(),
        60_000,
      ),
    ).toBe(false);
    expect(sessionNeedsRefresh({refreshToken: 'r'}, Date.now())).toBe(true);
  });
});
