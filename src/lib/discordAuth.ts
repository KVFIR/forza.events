import type {AppUser} from './types';

const TOKEN_KEY = 'forza_discord_access_token';
const USER_KEY = 'forza_discord_user';

const OAUTH_SCOPES = ['identify', 'guilds'];

export function getDiscordRedirectUri(): string {
  const explicit = import.meta.env.VITE_DISCORD_REDIRECT_URI as string | undefined;
  if (explicit?.trim()) return explicit.trim();
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`;
  }
  return '';
}

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
    scope: OAUTH_SCOPES.join(' '),
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
