import {coalesceInflight, dedupCacheKey} from './apiDedup';
import {ApiRequestError, apiErrorFromPayload} from './apiErrors';
import {trackApiError, trackNetworkError} from './analytics';
import {API_ERROR_CODES} from './apiErrorCodes';
import {clearDiscordSession} from './discordAuth';
import {SESSION_EXPIRED_EVENT} from './sessionEvents';
import {ensureDiscordSupabaseProxy} from './discordUrlProxy';
import {CLIENT_SURFACE_HEADER, resolveClientSurface} from './clientSurface';
import {createSupabaseFetch, isDiscordActivityFrame} from './supabaseEnv';
import {isSupabaseConfigured, resolveSupabaseUrl} from './supabase';

export {ApiRequestError} from './apiErrors';

function apiBase(): string {
  const explicit = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (explicit) return explicit.replace(/\/$/, '');
  const url = resolveSupabaseUrl();
  if (url) return `${url}/functions/v1`;
  return '';
}

export function isApiConfigured(): boolean {
  return isSupabaseConfigured() || Boolean(import.meta.env.VITE_API_BASE_URL);
}

function invokeErrorMeta(
  body: Record<string, unknown>,
): Record<string, string | number | boolean> | undefined {
  const meta: Record<string, string | number | boolean> = {};
  if (typeof body.action === 'string') meta.action = body.action;
  if (body.cancel === true) meta.cancel = true;
  if (body.delete === true) meta.delete = true;
  if (body.host_drafts === true) meta.host_drafts = true;
  return Object.keys(meta).length > 0 ? meta : undefined;
}

async function invoke<T>(
  name: string,
  body: Record<string, unknown>,
  discordAccessToken: string | null,
): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error('API not configured');

  if (isDiscordActivityFrame()) {
    await ensureDiscordSupabaseProxy();
  }

  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ?? '';
  const headers = new Headers({
    'Content-Type': 'application/json',
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    [CLIENT_SURFACE_HEADER]: resolveClientSurface(),
  });
  if (discordAccessToken) {
    headers.set('x-discord-access-token', discordAccessToken);
  }

  // Discord Activity proxy often strips auth headers; createSupabaseFetch re-applies them.
  const doFetch = isDiscordActivityFrame()
    ? (createSupabaseFetch(anonKey) ?? fetch)
    : fetch;

  const eventId = typeof body.event_id === 'string' ? body.event_id : undefined;
  const errorMeta = invokeErrorMeta(body);

  let res: Response;
  try {
    res = await doFetch(`${base}/${name}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    trackNetworkError(name, {eventId, meta: errorMeta});
    throw new ApiRequestError('Network request failed', {
      code: API_ERROR_CODES.NETWORK_ERROR,
      status: 0,
    });
  }

  const contentType = res.headers.get('content-type') ?? '';
  let data: {error?: string; message?: string; code?: string};
  if (contentType.includes('application/json')) {
    try {
      data = (await res.json()) as typeof data;
    } catch {
      const apiError = new ApiRequestError('Invalid server response', {
        code: API_ERROR_CODES.INVALID_RESPONSE,
        status: res.status,
      });
      trackApiError(name, apiError, {eventId, meta: errorMeta});
      throw apiError;
    }
  } else {
    const text = await res.text();
    console.error('invoke non-json', {name, status: res.status, snippet: text.slice(0, 200)});
    const apiError = new ApiRequestError('Invalid server response', {
      code: API_ERROR_CODES.INVALID_RESPONSE,
      status: res.status,
    });
    trackApiError(name, apiError, {eventId, meta: errorMeta});
    throw apiError;
  }

  if (!res.ok) {
    // A stale Discord token surfaces as 401 from Edge Functions — clear it and reset to guest.
    if (res.status === 401 && discordAccessToken) {
      clearDiscordSession();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      }
    }
    const apiError = apiErrorFromPayload(data, res.status);
    trackApiError(name, apiError, {eventId, meta: errorMeta});
    throw apiError;
  }
  return data as T;
}

export async function invokeBrowseEvents(
  body: {
    include_completed?: boolean;
    event_id?: string;
    host_drafts?: boolean;
  } = {},
  discordAccessToken: string | null = null,
): Promise<{data: unknown[]}> {
  return invoke<{data: unknown[]}>('browse-events', body, discordAccessToken);
}

export async function invokeHostDrafts(
  discordAccessToken: string,
): Promise<{data: unknown[]}> {
  return invoke<{data: unknown[]}>('host-drafts', {}, discordAccessToken);
}

export async function exchangeToken(
  code: string,
  options?: {guildId?: string; guildName?: string; redirectUri?: string},
) {
  return invoke<{
    access_token: string;
    user: import('./types').AppUser;
  }>(
    'token-exchange',
    {
      code,
      guild_id: options?.guildId,
      guild_name: options?.guildName,
      redirect_uri: options?.redirectUri,
    },
    null,
  );
}

const pendingTokenExchanges = new Map<
  string,
  ReturnType<typeof exchangeToken>
>();

/** Dedupe OAuth code exchange (React StrictMode runs effects twice in dev). */
export function exchangeTokenOnce(
  code: string,
  options?: {guildId?: string; guildName?: string; redirectUri?: string},
) {
  const key = `${code}\0${options?.redirectUri ?? ''}`;
  let pending = pendingTokenExchanges.get(key);
  if (!pending) {
    pending = exchangeToken(code, options).finally(() => {
      pendingTokenExchanges.delete(key);
    });
    pendingTokenExchanges.set(key, pending);
  }
  return pending;
}

export async function fetchLaunchIntent(
  discordToken: string,
  guildId: string | null,
): Promise<string | null> {
  const data = await invoke<{event_id: string | null}>(
    'launch-intent',
    guildId ? {guild_id: guildId} : {},
    discordToken,
  );
  return data.event_id;
}

export async function listGuilds(
  discordToken: string,
  options?: {fresh?: boolean; dmReachability?: boolean},
) {
  const cachePrefix = options?.dmReachability ? 'list-guilds:dm' : 'list-guilds';
  return coalesceInflight(
    dedupCacheKey(cachePrefix, discordToken),
    () =>
      invoke<{
        guilds: {
          id: string;
          name: string;
          icon_url?: string | null;
          rating_enabled?: boolean;
        }[];
        hint?: string | null;
      }>(
        'list-guilds',
        options?.dmReachability
          ? {
              dm_reachability: true,
              ...(options?.fresh ? {fresh: true} : {}),
            }
          : {},
        discordToken,
      ),
    {cacheMs: 30_000, fresh: options?.fresh},
  );
}

export async function listGuildMembers(
  discordToken: string,
  guildId: string,
  query: string,
) {
  return invoke<{
    members: {
      discord_id: string;
      username: string;
      avatar_url: string | null;
      xbox_gamertag: string | null;
    }[];
  }>('list-guild-members', {guild_id: guildId, query}, discordToken);
}

export type ListChannelsHintCode = 'NO_TEXT_CHANNELS' | 'NO_PERMITTED_CHANNELS';

export async function listChannels(
  discordToken: string,
  guildId: string,
  options?: {fresh?: boolean},
) {
  return coalesceInflight(
    dedupCacheKey('list-channels', discordToken, guildId),
    () =>
      invoke<{
        channels: {id: string; name: string; position: number}[];
        hint_code?: ListChannelsHintCode | null;
      }>('list-channels', {guild_id: guildId}, discordToken),
    {cacheMs: 30_000, fresh: options?.fresh},
  );
}

export async function validatePublishChannel(
  discordToken: string,
  guildId: string,
  channelId: string,
) {
  return invoke<{ok: boolean; error?: string; code?: string}>(
    'validate-channel',
    {guild_id: guildId, channel_id: channelId},
    discordToken,
  );
}

export async function publishEvent(
  discordToken: string,
  eventId: string,
  guildId: string,
  channelId: string,
  guildName?: string,
) {
  return invoke<{
    message_id: string;
    channel_id?: string;
    guild_id?: string;
    already_published?: boolean;
  }>(
    'publish-event',
    {event_id: eventId, guild_id: guildId, channel_id: channelId, guild_name: guildName},
    discordToken,
  );
}

export async function saveEvent(
  discordToken: string,
  payload: Record<string, unknown>,
) {
  return invoke<{id: string; slug: string}>('save-event', payload, discordToken);
}

export async function cancelEvent(discordToken: string, eventId: string) {
  return invoke<{id: string; cancelled: boolean}>(
    'save-event',
    {id: eventId, cancel: true},
    discordToken,
  );
}

export async function deleteDraftEvent(discordToken: string, eventId: string) {
  return invoke<{id: string; deleted: boolean}>(
    'save-event',
    {id: eventId, delete: true},
    discordToken,
  );
}

export async function joinEvent(
  discordToken: string,
  eventId: string,
  gamertag: string,
) {
  return invoke<{joined: boolean; waitlisted?: boolean; group_index?: number}>(
    'event-participation',
    {event_id: eventId, action: 'join', gamertag},
    discordToken,
  );
}

export async function leaveEvent(discordToken: string, eventId: string) {
  return invoke<{joined: boolean}>(
    'event-participation',
    {event_id: eventId, action: 'leave'},
    discordToken,
  );
}

export type AddGroupLeader = {
  discordId: string;
  gamertag?: string;
  /** Discord unique handle (`user.username`) — only needed for guild-member leaders. */
  username?: string;
  avatarUrl?: string | null;
};

export async function addGroup(
  discordToken: string,
  eventId: string,
  leader: AddGroupLeader,
) {
  return invoke<{ok: boolean; group_count: number}>(
    'add-group',
    {
      event_id: eventId,
      leader_discord_id: leader.discordId,
      leader_gamertag: leader.gamertag,
      leader_username: leader.username,
      leader_avatar_url: leader.avatarUrl,
    },
    discordToken,
  );
}

export async function changeGroupLeader(
  discordToken: string,
  eventId: string,
  groupIndex: number,
  leader: AddGroupLeader,
) {
  return invoke<{ok: boolean; group_index: number}>(
    'change-group-leader',
    {
      event_id: eventId,
      group_index: groupIndex,
      leader_discord_id: leader.discordId,
      leader_gamertag: leader.gamertag,
      leader_username: leader.username,
      leader_avatar_url: leader.avatarUrl,
    },
    discordToken,
  );
}

export type GroupRosterMode = 'balance' | 'shuffle' | 'balance_shuffle';

export async function balanceGroups(
  discordToken: string,
  eventId: string,
  mode: GroupRosterMode = 'balance',
) {
  return invoke<{
    ok: boolean;
    mode?: GroupRosterMode;
    unchanged?: boolean;
    moved: {discord_id: string; from_group: number; to_group: number}[];
  }>('balance-groups', {event_id: eventId, mode}, discordToken);
}

export type SubmitResultEntry = {
  discord_id: string;
  position: number | null;
  dnf?: boolean;
  dns?: boolean;
};

export async function submitEventResults(
  discordToken: string,
  eventId: string,
  results: SubmitResultEntry[],
) {
  return invoke<{
    ok: boolean;
    embed_synced?: boolean;
    rating_applied?: boolean;
    rating_retried?: boolean;
    rating_deltas?: {
      discord_id: string;
      rating_before: number;
      rating_after: number;
      delta: number;
    }[];
  }>('submit-results', {event_id: eventId, results}, discordToken);
}

/** Rating-only retry after results saved but ELO apply failed. */
export async function retryEventRatings(discordToken: string, eventId: string) {
  return invoke<{
    ok: boolean;
    rating_applied?: boolean;
    rating_retried?: boolean;
  }>('submit-results', {event_id: eventId}, discordToken);
}

export async function fetchLeaderboard(
  discordToken: string | null,
  options?: {limit?: number},
) {
  return invoke<{
    entries: {
      rank: number;
      discordId: string;
      username: string | null;
      avatarUrl: string | null;
      gamertag: string | null;
      rating: number;
      gamesRated: number;
      provisional: boolean;
    }[];
    viewer: {
      rank: number;
      rating: number;
      gamesRated: number;
      provisional: boolean;
    } | null;
    limit: number;
  }>('leaderboard', {limit: options?.limit ?? 100}, discordToken);
}

export async function updateProfile(
  discordToken: string,
  updates: {
    xbox_gamertag?: string;
    region?: string;
    timezone?: string;
    dm_notifications_enabled?: boolean;
    notification_locale?: string;
  },
) {
  return invoke<{user: import('./types').AppUser}>(
    'user-profile',
    updates,
    discordToken,
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to read cover image'));
        return;
      }
      const base64 = result.split(',')[1];
      if (!base64) {
        reject(new Error('Failed to encode cover image'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read cover image'));
    reader.readAsDataURL(file);
  });
}

export async function uploadCoverImage(
  discordToken: string,
  guildId: string | null | undefined,
  eventId: string,
  file: File,
): Promise<string> {
  const content_base64 = await fileToBase64(file);
  const trimmedGuild = guildId?.trim();
  const data = await invoke<{url: string}>(
    'upload-cover',
    {
      ...(trimmedGuild ? {guild_id: trimmedGuild} : {}),
      event_id: eventId,
      content_base64,
      content_type: file.type,
      filename: file.name,
    },
    discordToken,
  );
  return data.url;
}
