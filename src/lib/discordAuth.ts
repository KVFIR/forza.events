import type {AppUser} from './types';

const TOKEN_KEY = 'forza_discord_access_token';
const USER_KEY = 'forza_discord_user';

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
};

export function loadDiscordSession(): DiscordSession | null {
  const accessToken = readPersistentItem(TOKEN_KEY);
  const rawUser = readPersistentItem(USER_KEY);
  if (!accessToken || !rawUser) return null;
  try {
    return {accessToken, user: JSON.parse(rawUser) as AppUser};
  } catch {
    clearDiscordSession();
    return null;
  }
}

export function saveDiscordSession(session: DiscordSession): void {
  writePersistentItem(TOKEN_KEY, session.accessToken);
  writePersistentItem(USER_KEY, JSON.stringify(session.user));
}

export function clearDiscordSession(): void {
  removePersistentItem(TOKEN_KEY);
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
