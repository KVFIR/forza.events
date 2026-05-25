import {getSupabase, isSupabaseConfigured, resolveSupabaseUrl} from './supabase';

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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ?? '',
  };
  if (discordAccessToken) {
    headers['x-discord-access-token'] = discordAccessToken;
  }

  const res = await fetch(`${base}/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed: ${res.status}`);
  }
  return data as T;
}

export async function invokeBrowseEvents(
  body: {include_completed?: boolean; event_id?: string} = {},
): Promise<{data: unknown[]}> {
  return invoke<{data: unknown[]}>('browse-events', body, null);
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
  guildId: string,
): Promise<string | null> {
  const data = await invoke<{event_id: string | null}>(
    'launch-intent',
    {guild_id: guildId},
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
  return invoke<{channels: {id: string; name: string; position: number}[]}>(
    'list-channels',
    {guild_id: guildId},
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

export async function uploadCoverImage(
  guildId: string,
  eventId: string,
  file: File,
): Promise<string> {
  const supabase = await getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  const ext = (file.name.split('.').pop() ?? 'webp').toLowerCase();
  const safeExt = ['webp', 'jpg', 'jpeg', 'png'].includes(ext) ? ext : 'webp';
  const path = `${guildId}/${eventId}/cover.${safeExt}`;

  const {error} = await supabase.storage.from('event-covers').upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;

  const {data} = supabase.storage.from('event-covers').getPublicUrl(path);
  return data.publicUrl;
}
