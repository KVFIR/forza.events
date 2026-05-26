import {createSupabaseFetch, isDiscordActivityFrame} from './supabaseEnv';
import {isSupabaseConfigured, resolveSupabaseUrl} from './supabase';

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

async function invoke<T>(
  name: string,
  body: Record<string, unknown>,
  discordAccessToken: string | null,
): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error('API not configured');

  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ?? '';
  const headers = new Headers({
    'Content-Type': 'application/json',
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
  });
  if (discordAccessToken) {
    headers.set('x-discord-access-token', discordAccessToken);
  }

  // Discord Activity proxy often strips auth headers; createSupabaseFetch re-applies them.
  const doFetch = isDiscordActivityFrame()
    ? (createSupabaseFetch(anonKey) ?? fetch)
    : fetch;

  const res = await doFetch(`${base}/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as {error?: string; message?: string; code?: string};
  if (!res.ok) {
    throw new Error(
      data.error ?? data.message ?? data.code ?? `Request failed: ${res.status}`,
    );
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

export async function listGuilds(discordToken: string) {
  return invoke<{
    guilds: {id: string; name: string; icon_url?: string | null}[];
    hint?: string | null;
  }>('list-guilds', {}, discordToken);
}

export async function listChannels(discordToken: string, guildId: string) {
  return invoke<{
    channels: {id: string; name: string; position: number}[];
    hint?: string | null;
  }>('list-channels', {guild_id: guildId}, discordToken);
}

export async function validatePublishChannel(
  discordToken: string,
  guildId: string,
  channelId: string,
) {
  return invoke<{ok: boolean; error?: string}>(
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
  return invoke<{message_id: string}>(
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
  return invoke<{joined: boolean}>(
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

export type SubmitResultEntry = {
  discord_id: string;
  position: number;
  dnf?: boolean;
  dns?: boolean;
};

export async function submitEventResults(
  discordToken: string,
  eventId: string,
  results: SubmitResultEntry[],
) {
  return invoke<{ok: boolean}>('submit-results', {event_id: eventId, results}, discordToken);
}

export async function updateProfile(
  discordToken: string,
  updates: {xbox_gamertag?: string; region?: string; timezone?: string},
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
  guildId: string,
  eventId: string,
  file: File,
): Promise<string> {
  const content_base64 = await fileToBase64(file);
  const data = await invoke<{url: string}>(
    'upload-cover',
    {
      guild_id: guildId,
      event_id: eventId,
      content_base64,
      content_type: file.type,
      filename: file.name,
    },
    discordToken,
  );
  return data.url;
}
