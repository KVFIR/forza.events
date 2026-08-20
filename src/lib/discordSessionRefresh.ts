import {
  clearDiscordSession,
  expiresAtFromExpiresIn,
  loadDiscordSession,
  saveDiscordSession,
  sessionNeedsRefresh,
  type DiscordSession,
} from './discordAuth';
import {ApiRequestError} from './apiErrors';

let inflightRefresh: Promise<DiscordSession | null> | null = null;

const REFRESH_LOCK = 'forza-discord-token-refresh';

function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  if (locks && typeof locks.request === 'function') {
    return locks.request(REFRESH_LOCK, fn);
  }
  return fn();
}

function sessionRotatedSince(started: DiscordSession, latest: DiscordSession | null): boolean {
  return Boolean(
    latest?.accessToken &&
      (latest.refreshToken !== started.refreshToken || latest.accessToken !== started.accessToken),
  );
}

async function refreshStoredSessionOnce(): Promise<DiscordSession | null> {
  const started = loadDiscordSession();
  if (!started?.refreshToken) return null;

  return withRefreshLock(async () => {
    const session = loadDiscordSession();
    if (!session?.refreshToken) return null;
    // Another tab already rotated while we waited for the lock.
    if (sessionRotatedSince(started, session)) return session;

    try {
      // Dynamic import avoids a static cycle with api.ts (401 → refresh → invoke).
      const {refreshDiscordToken} = await import('./api');
      const result = await refreshDiscordToken(session.refreshToken);
      const next: DiscordSession = {
        accessToken: result.access_token,
        user: result.user ?? session.user,
        refreshToken: result.refresh_token ?? session.refreshToken,
        expiresAt:
          typeof result.expires_in === 'number'
            ? expiresAtFromExpiresIn(result.expires_in)
            : session.expiresAt,
      };
      saveDiscordSession(next);
      return next;
    } catch (e) {
      // Hard auth failure → drop stored tokens. Transport/5xx → rethrow (keep session).
      if (e instanceof ApiRequestError && (e.status === 401 || e.status === 400)) {
        const latest = loadDiscordSession();
        if (sessionRotatedSince(session, latest)) return latest;
        clearDiscordSession();
        return null;
      }
      throw e;
    }
  });
}

/**
 * Refresh Discord OAuth tokens using the stored refresh_token.
 * Concurrent callers share one in-flight request (401 storms / StrictMode).
 * Cross-tab callers serialize via Web Locks so Discord refresh-token rotation
 * cannot invalidate a sibling tab and wipe localStorage.
 */
export function refreshStoredDiscordSession(options?: {
  force?: boolean;
}): Promise<DiscordSession | null> {
  const session = loadDiscordSession();
  if (!session?.refreshToken) return Promise.resolve(null);
  if (!options?.force && !sessionNeedsRefresh(session)) {
    return Promise.resolve(session);
  }

  if (!inflightRefresh) {
    inflightRefresh = refreshStoredSessionOnce().finally(() => {
      inflightRefresh = null;
    });
  }
  return inflightRefresh;
}
