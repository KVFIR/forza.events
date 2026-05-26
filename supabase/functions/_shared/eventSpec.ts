import type {adminClient} from './supabase.ts';
import {isValidEventType} from './eventTypes.ts';

export type CarRuleMode = 'anything_goes' | 'restricted_list';

export type CarPayload = {
  id: string;
  make: string;
  model: string;
  year: number | null;
  pi: number;
  max_pi: number;
  tune_share_code?: string | null;
  car_restrictions?: string[];
};

export type SaveEventBody = {
  id?: string;
  guild_id?: string;
  guild_name?: string;
  channel_id?: string | null;
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
  max_pi?: number;
  track_codes?: string[];
  additional_car_restrictions?: string | null;
  cars?: CarPayload[];
  publish?: boolean;
  cancel?: boolean;
  delete?: boolean;
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

export function normalizeTrackCodes(codes?: string[]): string[] {
  return (codes ?? []).map((c) => String(c).trim()).filter(Boolean);
}

export function validateDraft(body: SaveEventBody): string | null {
  if (!body.title?.trim()) return 'Event name is required.';
  if (!isValidEventType(body.type)) return 'Event type is required.';
  if (!body.starts_at) return 'Start time is required.';
  if (!body.guild_id) return 'Choose a Discord server for this event.';
  return null;
}

export function validatePublishReady(body: SaveEventBody): string | null {
  const draftErr = validateDraft(body);
  if (draftErr) return draftErr;

  const leader = body.lobby_leader_gamertag?.trim();
  if (!leader) return 'Convoy leader gamertag is required.';

  const mode = body.car_rule_mode ?? 'anything_goes';
  if (mode === 'restricted_list') {
    if (!body.cars?.length) return 'Add at least one car for a restricted car list.';
  } else {
    const maxPi = Number(body.max_pi ?? 0);
    if (maxPi < 100 || maxPi > 999) return 'Set a PI cap between 100 and 999 for Open build.';
  }

  return null;
}

export function eventHasStarted(event: Pick<DbEvent, 'status' | 'starts_at'>): boolean {
  if (event.status === 'live' || event.status === 'checkin') return true;
  if (['completed', 'cancelled', 'archived'].includes(event.status)) return true;
  return new Date(event.starts_at).getTime() <= Date.now();
}

/** Players may leave only before start; roster locks when the event goes live. */
export function canLeaveEvent(event: Pick<DbEvent, 'status' | 'starts_at'>): boolean {
  if (['completed', 'cancelled', 'archived'].includes(event.status)) return false;
  return !eventHasStarted(event);
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

/** Event fields from save payload — never includes `status` (set only on insert). */
export function buildEventFields(
  body: SaveEventBody,
  hostDiscordId: string,
  coverUrl: string | null,
) {
  const trackCodes = normalizeTrackCodes(body.track_codes);
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
    host_discord_id: hostDiscordId,
    guild_id: body.guild_id,
    channel_id: body.channel_id?.trim() || null,
    starts_at: body.starts_at,
    timezone_hint: body.timezone_hint,
    max_pi: maxPi,
    car_rule_mode: mode,
    car_setup_mode: 'general' as const,
    tuning_restrictions: [] as string[],
    voice_policy: body.voice_policy ?? 'optional',
    max_players: PLAYER_SLOTS,
    cover_image_url: coverUrl,
    description: body.description ?? null,
    event_share_code: trackCodes[0] ?? null,
    track_codes: trackCodes.slice(1),
    rules_allowed:
      mode === 'anything_goes' && body.additional_car_restrictions?.trim()
        ? [`additional:${body.additional_car_restrictions.trim()}`]
        : ([] as string[]),
    additional_car_restrictions:
      mode === 'anything_goes' ? body.additional_car_restrictions?.trim() || null : null,
    rules_forbidden: [] as string[],
    lobby_leader_gamertag: body.lobby_leader_gamertag?.trim() ?? 'TBD',
    lobby_leader_is_host: body.lobby_leader_is_host ?? true,
  };
}

export function buildEventRow(
  body: SaveEventBody,
  hostDiscordId: string,
  coverUrl: string | null,
) {
  return {
    ...buildEventFields(body, hostDiscordId, coverUrl),
    status: 'draft' as const,
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
  if (
    body.channel_id !== undefined &&
    existing.channel_id &&
    body.channel_id.trim() !== existing.channel_id
  ) {
    return 'Channel cannot be changed after publish.';
  }
  return null;
}
