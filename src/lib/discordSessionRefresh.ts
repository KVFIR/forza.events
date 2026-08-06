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

async function refreshStoredSessionOnce(): Promise<DiscordSession | null> {
  const session = loadDiscordSession();
  if (!session?.refreshToken) return null;

  try {
    // Dynamic import avoids a static cycle with api.ts (401 → refresh → invoke).
    const {refreshDiscordToken} = await import('./api');
    const result = await refreshDiscordToken(session.refreshToken);
    const next: DiscordSession = {
      accessToken: result.access_token,
      user: result.user,
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
      clearDiscordSession();
      return null;
    }
    throw e;
  }
}

/**
 * Refresh Discord OAuth tokens using the stored refresh_token.
 * Concurrent callers share one in-flight request (401 storms / StrictMode).
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
