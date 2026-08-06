import type {AppUser} from './types';

const TOKEN_KEY = 'forza_discord_access_token';
const REFRESH_KEY = 'forza_discord_refresh_token';
const EXPIRES_KEY = 'forza_discord_token_expires_at';
const USER_KEY = 'forza_discord_user';

/** Refresh access token this long before Discord `expires_in` elapses. */
export const DISCORD_TOKEN_REFRESH_SKEW_MS = 60 * 60 * 1000;

function readPersistentItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const fromLocal = localStorage.getItem(key);
      if (fromLocal) return fromLocal;
    }
    if (typeof sessionStorage !== 'undefined') {
      const fromSession = sessionStorage.getItem(key);
      if (fromSession) {
        localStorage?.setItem(key, fromSession);
        sessionStorage.removeItem(key);
        return fromSession;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function writePersistentItem(key: string, value: string): void {
  try {
    localStorage?.setItem(key, value);
    sessionStorage?.removeItem(key);
  } catch {
    // ignore quota / privacy mode
  }
}

function removePersistentItem(key: string): void {
  try {
    localStorage?.removeItem(key);
    sessionStorage?.removeItem(key);
  } catch {
    // ignore
  }
}

const BROWSER_OAUTH_SCOPES = ['identify', 'guilds'];

/** Browser OAuth redirect — must match the origin the user opened and Discord portal entries. */
export function getDiscordRedirectUri(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`;
  }
  const explicit = import.meta.env.VITE_DISCORD_REDIRECT_URI as string | undefined;
  return explicit?.trim() ?? '';
}

/** Localhost browser tab — Discord OAuth authorize URL (`/auth/callback` on return). */
export function buildDiscordAuthorizeUrl(state = ''): string {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID as string | undefined;
  if (!clientId) throw new Error('DISCORD_CLIENT_ID is not configured');

  const redirectUri = getDiscordRedirectUri();
  if (!redirectUri) {
    throw new Error('Discord redirect URI is not configured');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: BROWSER_OAUTH_SCOPES.join(' '),
    state,
    prompt: 'consent',
  });

  return `https://discord.com/api/oauth2/authorize?${params}`;
}

export type DiscordSession = {
  accessToken: string;
  user: AppUser;
  refreshToken?: string;
  /** Epoch ms when `accessToken` expires (from Discord `expires_in`). */
  expiresAt?: number;
};

export type DiscordSessionWrite = {
  accessToken: string;
  user: AppUser;
  /** Omit to keep the previously stored refresh token. Pass null to clear. */
  refreshToken?: string | null;
  /** Omit to keep the previously stored expiry. Pass null to clear. */
  expiresAt?: number | null;
};

export function expiresAtFromExpiresIn(
  expiresInSeconds: number,
  nowMs = Date.now(),
): number {
  return nowMs + Math.max(0, expiresInSeconds) * 1000;
}

export function sessionNeedsRefresh(
  session: Pick<DiscordSession, 'refreshToken' | 'expiresAt'>,
  nowMs = Date.now(),
  skewMs = DISCORD_TOKEN_REFRESH_SKEW_MS,
): boolean {
  if (!session.refreshToken) return false;
  // Unknown expiry (partial legacy row) → refresh rather than wait for a 401.
  if (session.expiresAt == null) return true;
  return session.expiresAt - nowMs <= skewMs;
}

export function loadDiscordSession(): DiscordSession | null {
  const accessToken = readPersistentItem(TOKEN_KEY);
  const rawUser = readPersistentItem(USER_KEY);
  if (!accessToken || !rawUser) return null;
  try {
    const refreshToken = readPersistentItem(REFRESH_KEY) ?? undefined;
    const expiresRaw = readPersistentItem(EXPIRES_KEY);
    const expiresAt = expiresRaw ? Number(expiresRaw) : undefined;
    return {
      accessToken,
      user: JSON.parse(rawUser) as AppUser,
      ...(refreshToken ? {refreshToken} : {}),
      ...(expiresAt != null && Number.isFinite(expiresAt) ? {expiresAt} : {}),
    };
  } catch {
    clearDiscordSession();
    return null;
  }
}

/**
 * Persist browser Discord session. When `refreshToken` / `expiresAt` are omitted,
 * previous values are kept so profile patches do not wipe the refresh chain.
 */
export function saveDiscordSession(session: DiscordSessionWrite): void {
  const prev = loadDiscordSession();
  writePersistentItem(TOKEN_KEY, session.accessToken);
  writePersistentItem(USER_KEY, JSON.stringify(session.user));

  const refreshToken =
    session.refreshToken !== undefined ? session.refreshToken : prev?.refreshToken;
  if (refreshToken) {
    writePersistentItem(REFRESH_KEY, refreshToken);
  } else {
    removePersistentItem(REFRESH_KEY);
  }

  const expiresAt =
    session.expiresAt !== undefined ? session.expiresAt : prev?.expiresAt;
  if (expiresAt != null && Number.isFinite(expiresAt)) {
    writePersistentItem(EXPIRES_KEY, String(expiresAt));
  } else {
    removePersistentItem(EXPIRES_KEY);
  }
}

export function clearDiscordSession(): void {
  removePersistentItem(TOKEN_KEY);
  removePersistentItem(REFRESH_KEY);
  removePersistentItem(EXPIRES_KEY);
  removePersistentItem(USER_KEY);
}

/** Prefer session fields written after login (e.g. gamertag set on join) over stale auth payload. */
export function mergeSessionUser(fresh: AppUser): AppUser {
  const session = loadDiscordSession();
  if (!session?.user.discordId || session.user.discordId !== fresh.discordId) {
    return fresh;
  }
  return {
    ...fresh,
    xboxGamertag: session.user.xboxGamertag ?? fresh.xboxGamertag,
    dmNotificationsEnabled:
      session.user.dmNotificationsEnabled ?? fresh.dmNotificationsEnabled,
    notificationLocale: session.user.notificationLocale ?? fresh.notificationLocale,
  };
}
