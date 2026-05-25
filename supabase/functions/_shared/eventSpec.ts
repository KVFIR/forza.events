import type {adminClient} from './supabase.ts';

export type CarRuleMode = 'anything_goes' | 'restricted_list';

export type CarPayload = {
  id: string;
  make: string;
  model: string;
  year: number | null;
  pi: number;
  class: string;
  max_pi: number;
  tune_share_code?: string | null;
  car_restrictions?: string[];
};

export type SaveEventBody = {
  id?: string;
  guild_id?: string;
  guild_name?: string;
  title?: string;
  type?: string;
  starts_at?: string;
  timezone_hint?: string;
  description?: string;
  cover_image_url?: string | null;
  lobby_leader_gamertag?: string;
  lobby_leader_is_host?: boolean;
  voice_policy?: string;
  car_rule_mode?: CarRuleMode;
  car_class_cap?: string | null;
  max_pi?: number;
  primary_track_code?: string;
  extra_track_codes?: string[];
  cars?: CarPayload[];
  publish?: boolean;
  cancel?: boolean;
};

type DbEvent = {
  id: string;
  status: string;
  host_discord_id: string;
  guild_id: string;
  channel_id: string | null;
  discord_message_id: string | null;
  starts_at: string;
};

const PLAYER_SLOTS = 11;

export function normalizeTrackCodes(primary?: string, extras?: string[]): {
  primary: string;
  extras: string[];
} {
  const p = String(primary ?? '').trim();
  const list = (extras ?? []).map((c) => String(c).trim()).filter(Boolean);
  return {primary: p, extras: list};
}

export function validateDraft(body: SaveEventBody): string | null {
  if (!body.title?.trim()) return 'Event name is required.';
  if (!body.starts_at) return 'Start time is required.';
  if (!body.guild_id) return 'Choose a Discord server for this event.';
  return null;
}

export function validatePublishReady(
  body: SaveEventBody,
  hasCover: boolean,
): string | null {
  const draftErr = validateDraft(body);
  if (draftErr) return draftErr;

  const leader = body.lobby_leader_gamertag?.trim();
  if (!leader) return 'Convoy leader gamertag is required.';

  if (!hasCover && !body.cover_image_url) {
    return 'Cover image is required before publishing.';
  }

  const {primary} = normalizeTrackCodes(body.primary_track_code, body.extra_track_codes);
  if (!primary) return 'Primary track code is required before publishing.';

  const mode = body.car_rule_mode ?? 'anything_goes';
  if (mode === 'restricted_list') {
    if (!body.cars?.length) return 'Add at least one car for a restricted car list.';
  } else {
    const maxPi = Number(body.max_pi ?? 0);
    if (maxPi < 100 || maxPi > 999) return 'Set a PI cap between 100 and 999 for Anything goes.';
    if (!body.car_class_cap) return 'Choose a class cap for Anything goes.';
  }

  return null;
}

export function eventHasStarted(event: Pick<DbEvent, 'status' | 'starts_at'>): boolean {
  if (event.status === 'live' || event.status === 'checkin') return true;
  if (['completed', 'cancelled', 'archived'].includes(event.status)) return true;
  return new Date(event.starts_at).getTime() <= Date.now();
}

export function isPublishedStatus(status: string): boolean {
  return status !== 'draft';
}

export function canEditPublishedEvent(event: Pick<DbEvent, 'status' | 'starts_at'>): boolean {
  if (!isPublishedStatus(event.status)) return true;
  if (event.status === 'cancelled' || event.status === 'completed' || event.status === 'archived') {
    return false;
  }
  return !eventHasStarted(event);
}

export function buildEventRow(
  body: SaveEventBody,
  hostDiscordId: string,
  coverUrl: string | null,
) {
  const {primary, extras} = normalizeTrackCodes(
    body.primary_track_code,
    body.extra_track_codes,
  );
  const cars = body.cars ?? [];
  const mode: CarRuleMode = body.car_rule_mode ?? 'anything_goes';
  const maxPi =
    mode === 'anything_goes'
      ? Math.max(100, Math.min(999, Number(body.max_pi ?? 999)))
      : cars.length
      ? Math.max(...cars.map((c) => c.max_pi ?? 999))
      : Number(body.max_pi ?? 999);

  return {
    title: body.title?.trim(),
    type: body.type,
    status: 'draft' as const,
    host_discord_id: hostDiscordId,
    guild_id: body.guild_id,
    starts_at: body.starts_at,
    timezone_hint: body.timezone_hint,
    max_pi: maxPi,
    car_rule_mode: mode,
    car_class_cap: mode === 'anything_goes' ? body.car_class_cap ?? null : null,
    car_setup_mode: 'general' as const,
    tuning_restrictions: [] as string[],
    voice_policy: body.voice_policy ?? 'optional',
    max_players: PLAYER_SLOTS,
    cover_image_url: coverUrl,
    description: body.description ?? null,
    event_share_code: primary || null,
    track_codes: extras,
    rules_allowed: [] as string[],
    rules_forbidden: [] as string[],
    lobby_leader_gamertag: body.lobby_leader_gamertag?.trim() ?? 'TBD',
    lobby_leader_is_host: body.lobby_leader_is_host ?? true,
  };
}

export async function assertTargetNotLocked(
  supabase: ReturnType<typeof adminClient>,
  existing: DbEvent | null,
  body: SaveEventBody,
): Promise<string | null> {
  if (!existing || !isPublishedStatus(existing.status)) return null;
  if (body.guild_id && body.guild_id !== existing.guild_id) {
    return 'Server cannot be changed after publish.';
  }
  return null;
}
