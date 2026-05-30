import type {AppUser} from './types';

const TOKEN_KEY = 'forza_discord_access_token';
const USER_KEY = 'forza_discord_user';

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
  if (typeof sessionStorage === 'undefined') return null;
  const accessToken = sessionStorage.getItem(TOKEN_KEY);
  const rawUser = sessionStorage.getItem(USER_KEY);
  if (!accessToken || !rawUser) return null;
  try {
    return {accessToken, user: JSON.parse(rawUser) as AppUser};
  } catch {
    clearDiscordSession();
    return null;
  }
}

export function saveDiscordSession(session: DiscordSession): void {
  sessionStorage.setItem(TOKEN_KEY, session.accessToken);
  sessionStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearDiscordSession(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
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
  };
}
