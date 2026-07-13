import {invokeBrowseEvents, invokeHostDrafts} from './api';
import {getSupabase, isSupabaseConfigured} from './supabase';
import {isDiscordActivityFrame, shouldUseDirectSupabaseReads} from './supabaseEnv';
import {searchCarCatalog} from './carCatalog';
import {sortEventResultRows} from './eventResults';
import {EVENT_PLAYER_SLOTS} from './constants';
import {resolveEventCoverUrl} from './eventCovers';
import {parseTracksFromRow} from './eventTracks';
import {normalizeEventType} from './eventTypes';
import {isHostDraftLifecycle} from './draftEvents';
import {sortParticipantsByJoinedAt} from './eventRoster';
import {isBrowseFeedEvent, resolveEventDisplayStatus} from './eventSpec';
import {PI_MAX} from './pi';
import type {
  AppUser,
  CarRuleMode,
  EventLifecycle,
  EventParticipant,
  EventStatus,
  EventType,
  ForzaEvent,
} from './types';

export {
  canCancelEvent,
  canCancelPublishedEvent,
  canDeleteDraft,
  canEditEvent,
  canSubmitEventResults,
  eventHasStarted,
  isEventFinalized,
  isEventSuccessfullyCompleted,
  isPublishedEvent,
  isBrowseFeedEvent,
  isPublishedToDiscord,
  isRegistrationOpen,
  resolveEventDisplayStatus,
  shouldShowEventResults,
} from './eventSpec';

type DbEventRow = {
  id: string;
  slug: string;
  title: string;
  type: EventType;
  status: string;
  starts_at: string;
  ends_at?: string | null;
  created_at?: string | null;
  guild_id?: string | null;
  channel_id?: string | null;
  discord_message_id?: string | null;
  voice_policy: ForzaEvent['voicePolicy'];
  max_players: number;
  group_count?: number | null;
  current_players: number;
  max_pi?: number | null;
  car_rule_mode?: CarRuleMode | null;
  host_discord_id: string;
  description?: string | null;
  cover_image_url?: string | null;
  tracks?: unknown;
  event_share_code?: string | null;
  track_codes?: string[] | null;
  rules_allowed?: string[] | null;
  additional_car_restrictions?: string | null;
  lobby_leader_gamertag?: string | null;
  lobby_leader_is_host?: boolean | null;
  lobby_leader_discord_id?: string | null;
  timezone_hint?: string | null;
  users?: {username: string; avatar_url?: string | null} | null;
  discord_guilds?: {guild_name: string} | null;
  event_participants?: {
    discord_id: string;
    gamertag_snapshot?: string | null;
    is_convoy_leader?: boolean | null;
    participation_source?: string | null;
    group_index?: number | null;
    waitlisted?: boolean | null;
    joined_at?: string | null;
    users?: {username: string; avatar_url?: string | null} | null;
  }[];
  event_cars?: DbEventCarRow[];
  event_results?: DbEventResultRow[];
};

type DbEventResultRow = {
  discord_id: string;
  position: number | null;
  dnf?: boolean | null;
  dns?: boolean | null;
  points?: number | null;
  group_index?: number | null;
};

type DbEventCarRow = {
  max_pi?: number | null;
  tune_share_code?: string | null;
  car_restrictions?: string[] | null;
  cars?:
    | {
        id: string;
        make: string;
        model: string;
        year: number | null;
        pi: number;
      }
    | {
        id: string;
        make: string;
        model: string;
        year: number | null;
        pi: number;
      }[]
    | null;
};

const EVENT_LIST_SELECT = `
  *,
  users!events_host_discord_id_fkey(username, avatar_url),
  discord_guilds(guild_name),
  event_participants(
    order: joined_at,
    discord_id,
    gamertag_snapshot,
    is_convoy_leader,
    participation_source,
    group_index,
    waitlisted,
    joined_at,
    users!event_participants_discord_id_fkey(username, avatar_url)
  ),
  event_cars(max_pi, tune_share_code, car_restrictions, cars(id, make, model, year, pi))
`;

/** Event detail by id — includes published results rows. */
const EVENT_DETAIL_SELECT = `${EVENT_LIST_SELECT},
  event_results(discord_id, position, dnf, dns, points, group_index)`;

export function mapDbEventResultRows(rows: DbEventResultRow[] | null | undefined): EventResultRow[] {
  return (rows ?? []).map((r) => ({
    discordId: r.discord_id,
    position: r.position,
    dnf: r.dnf ?? false,
    dns: r.dns ?? false,
    points: r.points,
    groupIndex: r.group_index ?? 1,
  }));
}

function mapAllowedCars(eventCars: DbEventCarRow[] | undefined): ForzaEvent['allowedCars'] {
  return (eventCars ?? [])
    .map((ec) => {
      const raw = ec.cars;
      const car = (Array.isArray(raw) ? raw[0] : raw) as {
        id: string;
        make: string;
        model: string;
        year: number | null;
        pi: number;
      } | null;
      if (!car?.id) return null;
      return {
        carId: car.id,
        make: car.make,
        model: car.model,
        year: car.year,
        pi: car.pi,
        maxPi: ec.max_pi ?? car.pi,
        tuneShareCode: ec.tune_share_code ?? undefined,
        restrictions: ec.car_restrictions ?? [],
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);
}

export function mapDbEventWithRelations(row: DbEventRow): ForzaEvent {
  const event = mapDbEvent(row);
  event.allowedCars = mapAllowedCars(row.event_cars);
  if (row.event_results !== undefined) {
    event.publishedResults = mapDbEventResultRows(row.event_results);
  }
  return event;
}

async function fetchEventsWithRelations(
  buildQuery: (
    supabase: NonNullable<Awaited<ReturnType<typeof getSupabase>>>,
  ) => PromiseLike<{data: DbEventRow[] | null; error: unknown}>,
): Promise<ForzaEvent[] | null> {
  const supabase = await getSupabase();
  if (!supabase) return null;

  const {data, error} = await buildQuery(supabase);
  if (error) {
    console.error('fetchEventsWithRelations', error);
    return null;
  }

  return (data ?? []).map(mapDbEventWithRelations);
}

export type EventResultRow = {
  discordId: string;
  position: number | null;
  dnf: boolean;
  dns: boolean;
  points?: number | null;
  groupIndex?: number;
};

export type EventResultDisplay = {
  discordId: string;
  position: number | null;
  label: string;
  dnf: boolean;
  dns: boolean;
  points?: number | null;
  groupIndex?: number;
};

export function resolveEventResultDisplay(
  event: ForzaEvent,
  rows: EventResultRow[],
  unknownDriverLabel = 'Driver',
): EventResultDisplay[] {
  const labelById = new Map(
    event.participants.map((p) => [p.discordId, p.gamertag ?? p.username]),
  );

  return sortEventResultRows(rows).map((r) => ({
      discordId: r.discordId,
      position: r.position,
      label: labelById.get(r.discordId) ?? unknownDriverLabel,
      dnf: r.dnf,
      dns: r.dns,
      points: r.points,
      groupIndex: r.groupIndex ?? 1,
    }));
}

function mapStatus(row: DbEventRow): EventStatus {
  if (row.status === 'live' || row.status === 'checkin') return 'live';
  if (['completed', 'cancelled', 'archived'].includes(row.status)) return 'ended';
  if (new Date(row.starts_at).getTime() <= Date.now()) return 'live';
  if (row.current_players >= (row.group_count ?? 1) * row.max_players) return 'full';
  return 'open';
}

function mapLifecycle(status: string): EventLifecycle {
  if (status === 'draft') return 'draft';
  if (status === 'live' || status === 'checkin') return 'live';
  if (status === 'completed') return 'completed';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'archived') return 'archived';
  return 'open';
}

/** Apply a realtime `events` row patch (lobby count / status) without refetching relations. */
export function patchEventLobby(
  event: ForzaEvent,
  row: Pick<DbEventRow, 'current_players' | 'max_players' | 'status' | 'group_count'>,
): ForzaEvent {
  const lifecycle = mapLifecycle(row.status);
  const patched = {
    ...event,
    currentPlayers: row.current_players,
    maxPlayers: row.max_players,
    groupCount: row.group_count ?? event.groupCount,
    lifecycle,
  };
  return {
    ...patched,
    status: resolveEventDisplayStatus(patched),
  };
}

function rulesFromRow(row: DbEventRow): string {
  return row.description?.trim() || 'See event details for car and tuning requirements.';
}

export function mapDbEvent(row: DbEventRow): ForzaEvent {
  const host = row.users;
  const guild = row.discord_guilds;
  const participants = sortParticipantsByJoinedAt(
    row.event_participants?.map((p) => ({
      discordId: p.discord_id,
      username: p.users?.username?.trim() ?? '',
      avatarUrl: p.users?.avatar_url ?? undefined,
      gamertag: p.gamertag_snapshot ?? undefined,
      isConvoyLeader: p.is_convoy_leader ?? false,
      participationSource: (p.participation_source as EventParticipant['participationSource']) ??
        undefined,
      groupIndex: p.group_index ?? 1,
      waitlisted: p.waitlisted ?? false,
      joinedAt: p.joined_at ?? undefined,
    })) ?? [],
  );

  const leaderParticipant = participants.find(
    (p) => p.isConvoyLeader && (p.groupIndex ?? 1) === 1,
  );

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    type: normalizeEventType(row.type),
    status: mapStatus(row),
    lifecycle: mapLifecycle(row.status),
    startsAt: row.starts_at,
    endsAt: row.ends_at ?? undefined,
    createdAt: row.created_at ?? undefined,
    guildId: row.guild_id ?? undefined,
    guildName: guild?.guild_name ?? undefined,
    channelId: row.channel_id ?? undefined,
    discordMessageId: row.discord_message_id ?? undefined,
    carRuleMode: row.car_rule_mode ?? 'anything_goes',
    maxPi: row.max_pi ?? PI_MAX,
    allowedCars: [],
    voicePolicy: row.voice_policy,
    maxPlayers: row.max_players,
    groupCount: row.group_count ?? 1,
    currentPlayers: row.current_players,
    hostDiscordId: row.host_discord_id,
    hostUsername: host?.username ?? 'Host',
    hostAvatarUrl: host?.avatar_url ?? undefined,
    rules: rulesFromRow(row),
    description: row.description ?? undefined,
    coverImageUrl: resolveEventCoverUrl(normalizeEventType(row.type), row.cover_image_url),
    tracks: parseTracksFromRow(row.tracks, {
      event_share_code: row.event_share_code,
      track_codes: row.track_codes,
    }),
    additionalCarRestrictions:
      row.additional_car_restrictions ??
      (Array.isArray(row.rules_allowed)
        ? row.rules_allowed.find((rule) => rule.startsWith('additional:'))?.slice('additional:'.length)
        : undefined),
    lobbyLeaderGamertag:
      leaderParticipant?.gamertag ?? row.lobby_leader_gamertag ?? undefined,
    lobbyLeaderIsHost: leaderParticipant
      ? leaderParticipant.discordId === row.host_discord_id
      : (row.lobby_leader_is_host ?? true),
    lobbyLeaderDiscordId:
      leaderParticipant?.discordId ?? row.lobby_leader_discord_id ?? undefined,
    timezoneHint: row.timezone_hint ?? undefined,
    participants,
  };
}

export type FetchEventsOptions = {
  /** Include completed/cancelled/archived (for My Events & Profile). Default false for Browse. */
  includeCompleted?: boolean;
};

export function isEventCompleted(event: ForzaEvent): boolean {
  return ['completed', 'cancelled', 'archived'].includes(event.lifecycle);
}

export function isBrowsableEvent(event: ForzaEvent): boolean {
  return isBrowseFeedEvent(event);
}

export type PublishedEventsLoadError = 'not_configured' | 'fetch_failed';

export type PublishedEventsResult = {
  events: ForzaEvent[];
  error: PublishedEventsLoadError | null;
};

export async function fetchPublishedEvents(
  _guildId?: string,
  options: FetchEventsOptions = {},
): Promise<ForzaEvent[]> {
  return (await fetchPublishedEventsResult(undefined, options)).events;
}

export type FetchEventByIdOptions = {
  /** Required to load draft events (RLS hides drafts from anon reads). */
  discordToken?: string | null;
};

async function fetchEventsViaEdge(options: {
  includeCompleted?: boolean;
  eventId?: string;
  hostDrafts?: boolean;
  discordToken?: string | null;
}): Promise<ForzaEvent[] | null> {
  try {
    const {data} = await invokeBrowseEvents(
      {
        include_completed: options.includeCompleted,
        event_id: options.eventId,
        host_drafts: options.hostDrafts,
      },
      options.discordToken ?? null,
    );
    return (data ?? [])
      .map((row) => {
        try {
          return mapDbEventWithRelations(row as DbEventRow);
        } catch (mapErr) {
          console.error('browse-events map row', mapErr, row);
          return null;
        }
      })
      .filter((event): event is ForzaEvent => event !== null);
  } catch (err) {
    console.error('browse-events', err);
    return null;
  }
}

export type HostDraftsLoadError = 'unauthorized' | 'fetch_failed';

export type HostDraftsResult = {
  events: ForzaEvent[];
  error: HostDraftsLoadError | null;
};

/** Draft events for the signed-in host (not shown on public browse). */
export async function fetchHostDraftEvents(
  discordToken: string,
): Promise<HostDraftsResult> {
  if (!isSupabaseConfigured()) {
    return {events: [], error: null};
  }

  try {
    const {data} = await invokeHostDrafts(discordToken);
    const events = (data ?? []).map((row) => mapDbEventWithRelations(row as DbEventRow));
    return {events, error: null};
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('host-drafts', err);
    if (/unauthorized/i.test(message)) {
      return {events: [], error: 'unauthorized'};
    }

    // Backward compatibility if host-drafts is not deployed yet.
    try {
      const fallback = await fetchEventsViaEdge({hostDrafts: true, discordToken});
      if (fallback === null) return {events: [], error: 'fetch_failed'};
      const events = fallback.filter((e) => isHostDraftLifecycle(e.lifecycle));
      return {events, error: null};
    } catch (fallbackErr) {
      console.error('browse-events host_drafts', fallbackErr);
      return {events: [], error: 'fetch_failed'};
    }
  }
}

export async function fetchPublishedEventsResult(
  _guildId?: string,
  options: FetchEventsOptions = {},
): Promise<PublishedEventsResult> {
  const {includeCompleted = false} = options;
  const directReads = shouldUseDirectSupabaseReads();

  if (!isSupabaseConfigured()) {
    return {events: [], error: 'not_configured'};
  }

  if (!directReads) {
    const events = await fetchEventsViaEdge({includeCompleted});
    if (events === null) {
      return {events: [], error: 'fetch_failed'};
    }
    return {
      events: includeCompleted ? events : events.filter(isBrowseFeedEvent),
      error: null,
    };
  }

  const events = await fetchEventsWithRelations((supabase) => {
    let query = supabase
      .from('events')
      .select(EVENT_LIST_SELECT)
      .neq('status', 'draft')
      .order('starts_at', {ascending: true});

    if (!includeCompleted) {
      query = query.eq('status', 'open').gt('starts_at', new Date().toISOString());
    }

    return query;
  });

  if (events === null) {
    return {events: [], error: 'fetch_failed'};
  }

  return {
    events: includeCompleted ? events : events.filter(isBrowseFeedEvent),
    error: null,
  };
}

async function fetchPublishedEventViaPostgrest(id: string): Promise<ForzaEvent | undefined> {
  const events = await fetchEventsWithRelations((supabase) =>
    supabase.from('events').select(EVENT_DETAIL_SELECT).eq('id', id).neq('status', 'draft'),
  );
  if (events === null) return undefined;
  return events[0];
}

export async function fetchEventById(
  id: string,
  options: FetchEventByIdOptions = {},
): Promise<ForzaEvent | undefined> {
  if (!isSupabaseConfigured()) {
    return undefined;
  }

  const {discordToken} = options;
  const directReads = shouldUseDirectSupabaseReads();

  if (directReads) {
    const fromDb = await fetchPublishedEventViaPostgrest(id);
    if (fromDb) return fromDb;
    if (!discordToken) return undefined;
  }

  if (discordToken || isDiscordActivityFrame()) {
    const fromEdge = await fetchEventsViaEdge({
      includeCompleted: true,
      eventId: id,
      discordToken,
    });
    if (fromEdge?.length) return fromEdge[0];

    const fromDb = await fetchPublishedEventViaPostgrest(id);
    if (fromDb) return fromDb;

    return undefined;
  }

  return fetchPublishedEventViaPostgrest(id);
}

export type EventResultsFetchError = 'fetch_failed';

export type EventResultsFetchOutcome = {
  rows: EventResultRow[];
  error: EventResultsFetchError | null;
};

export async function fetchEventResults(eventId: string): Promise<EventResultsFetchOutcome> {
  if (!isSupabaseConfigured()) return {rows: [], error: null};

  const supabase = (await getSupabase())!;
  const {data, error} = await supabase
    .from('event_results')
    .select('discord_id, position, dnf, dns, points, group_index')
    .eq('event_id', eventId)
    .order('position', {ascending: true});

  if (error) {
    console.error('fetchEventResults', error);
    return {rows: [], error: 'fetch_failed'};
  }

  return {
    rows: (data ?? []).map((r) => ({
      discordId: r.discord_id,
      position: r.position,
      dnf: r.dnf ?? false,
      dns: r.dns ?? false,
      points: r.points,
      groupIndex: r.group_index ?? 1,
    })),
    error: null,
  };
}

export type CarSearchResult = {
  id: string;
  make: string;
  model: string;
  year: number | null;
  pi: number;
};

function sanitizeCarSearchQuery(query: string): string {
  return query.trim().replace(/[%_,]/g, ' ').slice(0, 80);
}

function carSearchIlikePattern(query: string): string {
  return `%${query.replace(/"/g, '').trim()}%`;
}

function mapCarSearchRows(
  data: {id: string; make: string; model: string; year: number | null; pi: number}[],
): CarSearchResult[] {
  return data.map((c) => ({
    id: c.id,
    make: c.make,
    model: c.model,
    year: c.year,
    pi: c.pi,
  }));
}

export async function searchCars(query: string): Promise<CarSearchResult[]> {
  const q = sanitizeCarSearchQuery(query);
  if (!q) return [];

  if (!isSupabaseConfigured()) {
    return await searchCarCatalog(q);
  }

  try {
    const supabase = (await getSupabase())!;
    const pattern = carSearchIlikePattern(q);
    const {data, error} = await supabase
      .from('cars')
      .select('id, make, model, year, pi')
      .eq('active', true)
      .or(
        `search_text.ilike."${pattern}",make.ilike."${pattern}",model.ilike."${pattern}"`,
      )
      .limit(20);

    if (error) {
      console.error('searchCars', error);
      return await searchCarCatalog(q);
    }

    if (data?.length) {
      return mapCarSearchRows(data);
    }

    return await searchCarCatalog(q);
  } catch (err) {
    console.error('searchCars', err);
    return await searchCarCatalog(q);
  }
}

function viewerParticipantRow(
  event: ForzaEvent,
  user: AppUser,
): ForzaEvent['participants'][number] | undefined {
  if (!user.discordId) return undefined;
  const row = event.participants.find((p) => p.discordId === user.discordId);
  if (!row || row.discordId === event.hostDiscordId) return undefined;
  return row;
}

/** Any roster row (incl. waitlist) — My Events Joined/All; host uses Hosted tab. */
export function userIsParticipating(event: ForzaEvent, user: AppUser): boolean {
  return viewerParticipantRow(event, user) !== undefined;
}

/** Active roster seat — Rich Presence, Profile results, Event Detail "joined". */
export function userIsJoined(event: ForzaEvent, user: AppUser): boolean {
  const row = viewerParticipantRow(event, user);
  return row !== undefined && !row.waitlisted;
}

/** True when the user has any participant row (any source) — used for Join/Leave button visibility. */
export function userHasParticipantRow(event: ForzaEvent, user: AppUser): boolean {
  return event.participants.some((p) => p.discordId === user.discordId);
}

export {EVENT_PLAYER_SLOTS};
