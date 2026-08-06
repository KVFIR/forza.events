import {exchangeToken, isApiConfigured} from './api';
import {DISCORD_ACTIVITY_REDIRECT_URI} from './discordConstants';
import {DISCORD_ACTIVITY_OAUTH_SCOPES} from './discordScopes';
import {ensureDiscordSupabaseProxy} from './discordUrlProxy';
import {resetRichPresenceSession} from './discordRichPresenceSession';
import {eventIdFromOpenEventCustomId} from './eventLaunch';
import {
  clearDiscordSession,
  expiresAtFromExpiresIn,
  loadDiscordSession,
  saveDiscordSession,
  sessionNeedsRefresh,
  type DiscordSessionWrite,
} from './discordAuth';
import {GUEST_USER} from './guestUser';
import type {AppUser} from './types';

const DISCORD_READY_TIMEOUT_MS = 15_000;

type DiscordSDKInstance = import('@discord/embedded-app-sdk').DiscordSDK;

export type InitResult = {
  user: AppUser;
  ready: boolean;
  accessToken: string | null;
  guildId: string | null;
  guildName: string | null;
  /** Set when Activity was opened from a published embed button (`open_event:{id}`). */
  launchEventId: string | null;
};

let resolvedUser: AppUser = {...GUEST_USER};
let discordAccessToken: string | null = null;
let guildId: string | null = null;
let guildName: string | null = null;

let sdkInstance: DiscordSDKInstance | null = null;
let initPromise: Promise<InitResult> | null = null;

export function isStandaloneBrowser(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.parent === window;
  } catch {
    return false;
  }
}

export function getDiscordAccessToken(): string | null {
  return discordAccessToken;
}

export function getGuildContext(): {guildId: string | null; guildName: string | null} {
  return {guildId, guildName};
}

export function getDiscordSdk(): DiscordSDKInstance | null {
  return sdkInstance;
}

export function setDiscordSession(accessToken: string, user: AppUser): void {
  discordAccessToken = accessToken;
  resolvedUser = user;
}

/** Drop the in-memory Discord session (e.g. after the API rejects a stale token with 401). */
export function clearDiscordAuthState(): void {
  discordAccessToken = null;
  resolvedUser = {...GUEST_USER};
}

function sessionToInitResult(session: {
  accessToken: string;
  user: AppUser;
}): InitResult {
  setDiscordSession(session.accessToken, session.user);
  return {
    user: session.user,
    ready: true,
    accessToken: session.accessToken,
    guildId: null,
    guildName: null,
    launchEventId: null,
  };
}

function applyBrowserSession(): InitResult | null {
  const session = loadDiscordSession();
  if (!session) return null;
  return sessionToInitResult(session);
}

function persistOAuthTokens(
  result: {
    access_token: string;
    refresh_token?: string | null;
    expires_in?: number;
    user: AppUser;
  },
): void {
  const write: DiscordSessionWrite = {
    accessToken: result.access_token,
    user: result.user,
  };
  if (result.refresh_token) {
    write.refreshToken = result.refresh_token;
  }
  if (typeof result.expires_in === 'number') {
    write.expiresAt = expiresAtFromExpiresIn(result.expires_in);
  }
  saveDiscordSession(write);
}

async function trackActivityAuthFailed(apiCode: string): Promise<void> {
  const {track} = await import('./analytics');
  track('auth_failed', {
    outcome: 'error',
    api_code: apiCode,
    meta: {source: 'activity'},
  });
}

async function authenticateDiscordActivity(
  sdk: DiscordSDKInstance,
  clientId: string,
): Promise<{user: AppUser; accessToken: string | null}> {
  resetRichPresenceSession();
  guildId = sdk.guildId ?? null;
  guildName = null;

  let code: string;
  try {
    ({code} = await sdk.commands.authorize({
      client_id: clientId,
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: [...DISCORD_ACTIVITY_OAUTH_SCOPES],
    }));
  } catch (err) {
    console.error('Discord Activity authorize failed', err);
    void trackActivityAuthFailed('DISCORD_AUTHORIZE_FAILED');
    const user = {...GUEST_USER, username: 'Discord'};
    resolvedUser = user;
    discordAccessToken = null;
    return {user, accessToken: null};
  }

  if (!isApiConfigured()) {
    const user = {...GUEST_USER, username: 'Discord'};
    resolvedUser = user;
    discordAccessToken = null;
    return {user, accessToken: null};
  }

  try {
    const result = await exchangeToken(code, {
      guildId: guildId ?? undefined,
      guildName: guildName ?? undefined,
      redirectUri: DISCORD_ACTIVITY_REDIRECT_URI,
    });
    discordAccessToken = result.access_token;
    resolvedUser = result.user;
    persistOAuthTokens(result);
    await sdk.commands.authenticate({access_token: result.access_token});
    return {user: result.user, accessToken: result.access_token};
  } catch (err) {
    console.error('Discord Activity auth failed', err);
    const user = {...GUEST_USER, username: 'Discord'};
    resolvedUser = user;
    discordAccessToken = null;
    return {user, accessToken: null};
  }
}

async function waitForDiscordReady(sdk: DiscordSDKInstance): Promise<void> {
  let timeoutId: number | undefined;
  try {
    await Promise.race([
      sdk.ready(),
      new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(
          () => reject(new Error('DISCORD_READY_TIMEOUT')),
          DISCORD_READY_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
}

export function canRetryDiscordActivityAuth(): boolean {
  return (
    !isStandaloneBrowser() &&
    Boolean(sdkInstance) &&
    Boolean(import.meta.env.VITE_DISCORD_CLIENT_ID as string | undefined)
  );
}

/** Re-run authorize + token exchange after a failed Activity sign-in. */
export async function retryDiscordActivityAuth(): Promise<InitResult | null> {
  const sdk = sdkInstance;
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID as string | undefined;
  if (!sdk || !clientId || isStandaloneBrowser()) return null;

  const launchEventId = eventIdFromOpenEventCustomId(sdk.customId);
  const {user, accessToken} = await authenticateDiscordActivity(sdk, clientId);

  return {
    user,
    ready: Boolean(accessToken),
    accessToken,
    guildId,
    guildName,
    launchEventId,
  };
}

export async function initDiscordActivity(): Promise<InitResult> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (isStandaloneBrowser()) {
      const existing = applyBrowserSession();
      if (existing) {
        try {
          const prior = loadDiscordSession();
          const attemptedRefresh = Boolean(prior && sessionNeedsRefresh(prior));
          const {refreshStoredDiscordSession} = await import('./discordSessionRefresh');
          const refreshed = await refreshStoredDiscordSession();
          if (refreshed) return sessionToInitResult(refreshed);
          // Hard refresh failure already cleared localStorage — drop in-memory too.
          if (attemptedRefresh) {
            clearDiscordSession();
            clearDiscordAuthState();
            return {
              user: {...GUEST_USER},
              ready: false,
              accessToken: null,
              guildId: null,
              guildName: null,
              launchEventId: null,
            };
          }
        } catch (err) {
          console.warn('Discord session refresh on load failed', err);
        }
        return existing;
      }

      resolvedUser = {...GUEST_USER};
      return {
        user: resolvedUser,
        ready: false,
        accessToken: null,
        guildId: null,
        guildName: null,
        launchEventId: null,
      };
    }

    const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID as string | undefined;
    if (!clientId) {
      resolvedUser = {...GUEST_USER};
      return {
        user: resolvedUser,
        ready: false,
        accessToken: null,
        guildId: null,
        guildName: null,
        launchEventId: null,
      };
    }

    await ensureDiscordSupabaseProxy();

    const {DiscordSDK} = await import('@discord/embedded-app-sdk');
    const sdk = new DiscordSDK(clientId);

    try {
      await waitForDiscordReady(sdk);
    } catch (err) {
      console.error('Discord Activity SDK ready failed', err);
      const apiCode = err instanceof Error && err.message === 'DISCORD_READY_TIMEOUT'
        ? 'DISCORD_READY_TIMEOUT'
        : 'DISCORD_SDK_READY_FAILED';
      void import('./analytics').then(({track}) => {
        track('auth_failed', {
          outcome: 'error',
          api_code: apiCode,
          meta: {source: 'activity'},
        });
      });
      resolvedUser = {...GUEST_USER};
      return {
        user: resolvedUser,
        ready: false,
        accessToken: null,
        guildId: null,
        guildName: null,
        launchEventId: null,
      };
    }

    sdkInstance = sdk;

    const launchEventId = eventIdFromOpenEventCustomId(sdk.customId);
    const {user, accessToken} = await authenticateDiscordActivity(sdk, clientId);

    return {
      user,
      ready: Boolean(accessToken),
      accessToken,
      guildId,
      guildName,
      launchEventId,
    };
  })();

  return initPromise;
}

export function setResolvedUser(user: AppUser) {
  resolvedUser = user;
  const token = discordAccessToken;
  if (token) {
    saveDiscordSession({accessToken: token, user});
  }
}
