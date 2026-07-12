import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  clearDiscordSession,
  loadDiscordSession,
  saveDiscordSession,
} from '../src/lib/discordAuth';
import {GUEST_USER} from '../src/lib/guestUser';

const TOKEN_KEY = 'forza_discord_access_token';
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
});
