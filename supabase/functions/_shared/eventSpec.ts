import type {adminClient} from './supabase.ts';
import {isValidEventType} from './eventTypes.ts';
import {normalizeEventGame, type ForzaGame} from './eventGames.ts';
import {normalizeTrackRows, validateTrackRows, type EventTrackRow} from './eventTracks.ts';
import {clampPi, isPiInRange, PI_MAX} from './pi.ts';
import {VALIDATION_CODES, type ValidationCode} from './validationCodes.ts';

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
  game?: string;
  starts_at?: string;
  timezone_hint?: string;
  description?: string;
  cover_image_url?: string | null;
  lobby_leader_gamertag?: string;
  lobby_leader_is_host?: boolean;
  lobby_leader_discord_id?: string | null;
  /** Discord unique username (`user.username`) — used to create `users` row for FK. */
  lobby_leader_username?: string | null;
  lobby_leader_avatar_url?: string | null;
  voice_policy?: string;
  car_rule_mode?: CarRuleMode;
  max_pi?: number | null;
  /** @deprecated legacy — use `tracks` */
  track_codes?: string[];
  tracks?: EventTrackRow[];
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
  guild_id: string | null;
  channel_id: string | null;
  discord_message_id: string | null;
  starts_at: string;
  game?: string | null;
};

const PLAYER_SLOTS = 12;

export function resolveSaveTracks(body: SaveEventBody): EventTrackRow[] {
  if (body.tracks?.length) return normalizeTrackRows(body.tracks);
  const legacy = (body.track_codes ?? []).map((c) => String(c).trim()).filter(Boolean);
  return legacy.map((share_code) => ({name: '', share_code, format: null}));
}

export function validateDraft(body: SaveEventBody): ValidationCode | null {
  if (!body.title?.trim()) return VALIDATION_CODES.TITLE_REQUIRED;
  if (!isValidEventType(body.type)) return VALIDATION_CODES.TYPE_REQUIRED;
  if (!body.starts_at) return VALIDATION_CODES.STARTS_AT_REQUIRED;
  const trackErr = validateTrackRows(resolveSaveTracks(body));
  if (trackErr) return trackErr;
  return null;
}

export function validatePublishReady(body: SaveEventBody): ValidationCode | null {
  const draftErr = validateDraft(body);
  if (draftErr) return draftErr;
  if (!body.guild_id?.trim()) return VALIDATION_CODES.GUILD_REQUIRED;
  if (!body.channel_id?.trim()) return VALIDATION_CODES.CHANNEL_REQUIRED;

  const leader = body.lobby_leader_gamertag?.trim();
  if (!leader) return VALIDATION_CODES.CONVOY_LEADER_REQUIRED;

  const mode = body.car_rule_mode ?? 'anything_goes';
  if (mode === 'restricted_list') {
    if (!body.cars?.length) return VALIDATION_CODES.CARS_REQUIRED;
  } else if (body.max_pi != null && !isPiInRange(Number(body.max_pi))) {
    return VALIDATION_CODES.PI_RANGE;
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
  lobbyLeader?: {
    lobby_leader_discord_id: string;
    lobby_leader_is_host: boolean;
    lobby_leader_gamertag: string;
  },
) {
  const tracks = resolveSaveTracks(body);
  const cars = body.cars ?? [];
  const mode: CarRuleMode = body.car_rule_mode ?? 'anything_goes';
  const maxPi =
    mode === 'anything_goes'
      ? body.max_pi == null
        ? null
        : clampPi(Number(body.max_pi))
      : cars.length
      ? Math.max(...cars.map((c) => clampPi(c.max_pi ?? PI_MAX)))
      : body.max_pi == null
      ? null
      : clampPi(Number(body.max_pi));

  return {
    title: body.title?.trim(),
    type: body.type,
    game: normalizeEventGame(body.game) as ForzaGame,
    host_discord_id: hostDiscordId,
    guild_id: body.guild_id?.trim() || null,
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
    tracks,
    event_share_code: null,
    track_codes: [],
    rules_allowed:
      mode === 'anything_goes' && body.additional_car_restrictions?.trim()
        ? [`additional:${body.additional_car_restrictions.trim()}`]
        : ([] as string[]),
    additional_car_restrictions:
      mode === 'anything_goes' ? body.additional_car_restrictions?.trim() || null : null,
    rules_forbidden: [] as string[],
    lobby_leader_gamertag: lobbyLeader?.lobby_leader_gamertag ??
      body.lobby_leader_gamertag?.trim() ?? 'TBD',
    lobby_leader_is_host: lobbyLeader?.lobby_leader_is_host ??
      body.lobby_leader_is_host ?? true,
    lobby_leader_discord_id: lobbyLeader?.lobby_leader_discord_id ?? null,
  };
}

export function buildEventRow(
  body: SaveEventBody,
  hostDiscordId: string,
  coverUrl: string | null,
  lobbyLeader?: {
    lobby_leader_discord_id: string;
    lobby_leader_is_host: boolean;
    lobby_leader_gamertag: string;
  },
) {
  return {
    ...buildEventFields(body, hostDiscordId, coverUrl, lobbyLeader),
    status: 'draft' as const,
  };
}

export async function assertTargetNotLocked(
  supabase: ReturnType<typeof adminClient>,
  existing: DbEvent | null,
  body: SaveEventBody,
): Promise<ValidationCode | null> {
  if (!existing || !isPublishedStatus(existing.status)) return null;
  if (body.guild_id && body.guild_id !== existing.guild_id) {
    return VALIDATION_CODES.TARGET_GUILD_LOCKED;
  }
  if (
    body.channel_id != null &&
    existing.channel_id &&
    body.channel_id.trim() !== existing.channel_id
  ) {
    return VALIDATION_CODES.TARGET_CHANNEL_LOCKED;
  }
  if (
    body.game != null &&
    body.game !== '' &&
    normalizeEventGame(body.game) !== normalizeEventGame(existing.game)
  ) {
    return VALIDATION_CODES.GAME_LOCKED;
  }
  return null;
}
