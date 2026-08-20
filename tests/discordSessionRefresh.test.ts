import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {ApiRequestError} from '../src/lib/apiErrors';
import {API_ERROR_CODES} from '../src/lib/apiErrorCodes';
import {
  clearDiscordSession,
  loadDiscordSession,
  saveDiscordSession,
} from '../src/lib/discordAuth';
import {refreshStoredDiscordSession} from '../src/lib/discordSessionRefresh';
import {GUEST_USER} from '../src/lib/guestUser';

const refreshDiscordToken = vi.fn();

vi.mock('../src/lib/api', () => ({
  refreshDiscordToken: (...args: unknown[]) => refreshDiscordToken(...args),
}));

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

describe('refreshStoredDiscordSession', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorage());
    vi.stubGlobal('sessionStorage', createStorage());
    refreshDiscordToken.mockReset();
  });

  afterEach(() => {
    clearDiscordSession();
    vi.unstubAllGlobals();
  });

  function seedExpiringSession() {
    const user = {...GUEST_USER, discordId: 'u1', username: 'driver'};
    saveDiscordSession({
      accessToken: 'old-access',
      refreshToken: 'refresh-1',
      expiresAt: Date.now() + 30_000,
      user,
    });
    return user;
  }

  it('returns the stored session when refresh is not due', async () => {
    const user = {...GUEST_USER, discordId: 'u1', username: 'driver'};
    saveDiscordSession({
      accessToken: 'ok',
      refreshToken: 'refresh-1',
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      user,
    });

    const next = await refreshStoredDiscordSession();
    expect(next?.accessToken).toBe('ok');
    expect(refreshDiscordToken).not.toHaveBeenCalled();
  });

  it('force-refreshes and persists rotated tokens', async () => {
    const user = seedExpiringSession();
    refreshDiscordToken.mockResolvedValue({
      access_token: 'new-access',
      refresh_token: 'refresh-2',
      expires_in: 604800,
      user: {...user, xboxGamertag: 'Tag'},
    });

    const next = await refreshStoredDiscordSession({force: true});
    expect(refreshDiscordToken).toHaveBeenCalledWith('refresh-1');
    expect(next?.accessToken).toBe('new-access');
    expect(next?.refreshToken).toBe('refresh-2');
    expect(loadDiscordSession()?.accessToken).toBe('new-access');
  });

  it('keeps stored profile when refresh omits user', async () => {
    const user = seedExpiringSession();
    refreshDiscordToken.mockResolvedValue({
      access_token: 'new-access',
      refresh_token: 'refresh-2',
      expires_in: 604800,
    });

    const next = await refreshStoredDiscordSession({force: true});
    expect(next?.accessToken).toBe('new-access');
    expect(next?.user.discordId).toBe(user.discordId);
    expect(loadDiscordSession()?.user.discordId).toBe('u1');
  });

  it('keeps a session another tab already rotated when refresh returns invalid_grant', async () => {
    const user = seedExpiringSession();
    refreshDiscordToken.mockImplementation(async () => {
      saveDiscordSession({
        accessToken: 'other-tab-access',
        refreshToken: 'refresh-2',
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        user,
      });
      throw new ApiRequestError('expired', {
        code: API_ERROR_CODES.UNAUTHORIZED,
        status: 401,
      });
    });

    const next = await refreshStoredDiscordSession({force: true});
    expect(next?.accessToken).toBe('other-tab-access');
    expect(loadDiscordSession()?.refreshToken).toBe('refresh-2');
  });

  it('skips Discord when the refresh lock waits on a tab that already rotated', async () => {
    const user = seedExpiringSession();
    vi.stubGlobal('navigator', {
      locks: {
        request: async (_name: string, cb: () => Promise<unknown>) => {
          saveDiscordSession({
            accessToken: 'from-lock-winner',
            refreshToken: 'refresh-2',
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
            user,
          });
          return cb();
        },
      },
    });

    const next = await refreshStoredDiscordSession({force: true});
    expect(refreshDiscordToken).not.toHaveBeenCalled();
    expect(next?.accessToken).toBe('from-lock-winner');
  });

  it('clears storage and returns null on hard Discord auth failure', async () => {
    seedExpiringSession();
    refreshDiscordToken.mockRejectedValue(
      new ApiRequestError('expired', {
        code: API_ERROR_CODES.UNAUTHORIZED,
        status: 401,
      }),
    );

    await expect(refreshStoredDiscordSession({force: true})).resolves.toBeNull();
    expect(loadDiscordSession()).toBeNull();
  });

  it('keeps storage and rethrows on transport/5xx failures', async () => {
    seedExpiringSession();
    refreshDiscordToken.mockRejectedValue(
      new ApiRequestError('upstream', {
        code: API_ERROR_CODES.INTERNAL,
        status: 503,
      }),
    );

    await expect(refreshStoredDiscordSession({force: true})).rejects.toThrow('upstream');
    expect(loadDiscordSession()?.refreshToken).toBe('refresh-1');
  });

  it('dedupes concurrent refresh calls', async () => {
    seedExpiringSession();
    let resolveRefresh!: (value: unknown) => void;
    refreshDiscordToken.mockReturnValue(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
    );

    const a = refreshStoredDiscordSession({force: true});
    const b = refreshStoredDiscordSession({force: true});
    await vi.waitFor(() => {
      expect(refreshDiscordToken).toHaveBeenCalledTimes(1);
    });

    resolveRefresh({
      access_token: 'shared',
      refresh_token: 'refresh-2',
      expires_in: 1000,
      user: {...GUEST_USER, discordId: 'u1', username: 'driver'},
    });

    const [ra, rb] = await Promise.all([a, b]);
    expect(ra?.accessToken).toBe('shared');
    expect(rb?.accessToken).toBe('shared');
  });
});
