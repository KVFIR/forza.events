import {exchangeToken, isApiConfigured} from './api';
import {DISCORD_ACTIVITY_REDIRECT_URI} from './discordConstants';
import {completeActivityLaunchResolution} from './activityLaunch';
import {resolveActivityLaunchAfterAuth} from './resolveActivityLaunch';
import {loadDiscordSession, saveDiscordSession} from './discordAuth';
import {GUEST_USER} from './guestUser';
import type {AppUser} from './types';

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

export function getUser(): AppUser {
  return resolvedUser;
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

function applyBrowserSession(): InitResult | null {
  const session = loadDiscordSession();
  if (!session) return null;
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

async function authenticateDiscordActivity(
  sdk: DiscordSDKInstance,
  clientId: string,
): Promise<{user: AppUser; accessToken: string | null}> {
  guildId = sdk.guildId ?? null;
  guildName = null;

  const {code} = await sdk.commands.authorize({
    client_id: clientId,
    response_type: 'code',
    state: '',
    prompt: 'none',
    scope: ['identify', 'guilds'],
  });

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
    saveDiscordSession({accessToken: result.access_token, user: result.user});
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

  const {user, accessToken} = await authenticateDiscordActivity(sdk, clientId);

  const launchEventId = await resolveActivityLaunchAfterAuth({
    sdkCustomId: sdk.customId,
    accessToken,
    guildId,
  });

  return {
    user,
    ready: true,
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
      completeActivityLaunchResolution(false);
      const existing = applyBrowserSession();
      if (existing) return existing;

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

    const {DiscordSDK} = await import('@discord/embedded-app-sdk');
    const sdk = new DiscordSDK(clientId);
    sdkInstance = sdk;
    await sdk.ready();

    const {user, accessToken} = await authenticateDiscordActivity(sdk, clientId);

    const launchEventId = await resolveActivityLaunchAfterAuth({
      sdkCustomId: sdk.customId,
      accessToken,
      guildId,
    });

    return {
      user,
      ready: true,
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
