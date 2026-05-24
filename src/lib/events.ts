import {getSupabase, isSupabaseConfigured} from './supabase';
import {searchCarCatalog} from './carCatalog';
import {EVENT_PLAYER_SLOTS} from './constants';
import {resolveEventCoverUrl} from './eventCovers';
import {MOCK_EVENTS} from './mockData';

const MOCK_EVENT_RESULTS: Record<string, EventResultRow[]> = {
  'evt-2': [
    {discordId: '100000000000000001', position: 1, dnf: false},
    {discordId: '200000000000000010', position: 2, dnf: false},
    {discordId: '200000000000000011', position: 3, dnf: true},
  ],
};
import type {CarClassLetter} from './pi';
import type {AppUser, EventStatus, EventType, ForzaEvent} from './types';

type DbEventRow = {
  id: string;
  slug: string;
  title: string;
  type: EventType;
  status: string;
  starts_at: string;
  ends_at?: string | null;
  created_at?: string | null;
  voice_policy: ForzaEvent['voicePolicy'];
  max_players: number;
  current_players: number;
  host_discord_id: string;
  description?: string | null;
  cover_image_url?: string | null;
  track_codes?: string[] | null;
  lobby_leader_gamertag?: string | null;
  timezone_hint?: string | null;
  users?: {username: string; avatar_url?: string | null} | null;
  event_participants?: {
    discord_id: string;
    gamertag_snapshot?: string | null;
  }[];
};

export type EventResultRow = {
  discordId: string;
  position: number;
  dnf: boolean;
  points?: number | null;
};

export type EventResultDisplay = {
  position: number;
  label: string;
  dnf: boolean;
  points?: number | null;
};

export function resolveEventResultDisplay(
  event: ForzaEvent,
  rows: EventResultRow[],
): EventResultDisplay[] {
  const labelById = new Map(
    event.participants.map((p) => [p.discordId, p.gamertag ?? p.username]),
  );
  if (!labelById.has(event.hostDiscordId)) {
    labelById.set(event.hostDiscordId, event.hostUsername);
  }

  return [...rows]
    .sort((a, b) => a.position - b.position)
    .map((r) => ({
      position: r.position,
      label: labelById.get(r.discordId) ?? 'Driver',
      dnf: r.dnf,
      points: r.points,
    }));
}

function mapStatus(row: DbEventRow): EventStatus {
  if (row.status === 'live' || row.status === 'checkin') return 'live';
  if (['completed', 'cancelled', 'archived'].includes(row.status)) return 'ended';
  if (row.current_players >= row.max_players) return 'full';
  return 'open';
}

function rulesFromRow(row: DbEventRow): string {
  return row.description?.trim() || 'See event details for car and tuning requirements.';
}

export function mapDbEvent(row: DbEventRow): ForzaEvent {
  const host = row.users;
  const participants =
    row.event_participants?.map((p) => ({
      discordId: p.discord_id,
      username: p.gamertag_snapshot ?? 'Driver',
      gamertag: p.gamertag_snapshot ?? undefined,
    })) ?? [];

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    type: row.type,
    status: mapStatus(row),
    startsAt: row.starts_at,
    endsAt: row.ends_at ?? undefined,
    createdAt: row.created_at ?? undefined,
    allowedCars: [],
    voicePolicy: row.voice_policy,
    maxPlayers: row.max_players,
    currentPlayers: row.current_players,
    hostDiscordId: row.host_discord_id,
    hostUsername: host?.username ?? 'Host',
    hostAvatarUrl: host?.avatar_url ?? undefined,
    rules: rulesFromRow(row),
    description: row.description ?? undefined,
    coverImageUrl: resolveEventCoverUrl(row.type, row.cover_image_url),
    trackList: row.track_codes ?? [],
    lobbyLeaderGamertag: row.lobby_leader_gamertag ?? undefined,
    timezoneHint: row.timezone_hint ?? undefined,
    participants,
  };
}

async function hydrateEvents(rows: DbEventRow[]): Promise<ForzaEvent[]> {
  if (rows.length === 0) return [];
  const supabase = getSupabase()!;
  const hostIds = [...new Set(rows.map((r) => r.host_discord_id))];
  const eventIds = rows.map((r) => r.id);

  const [{data: hosts}, {data: parts}, {data: eventCars}] = await Promise.all([
    supabase.from('users').select('discord_id, username, avatar_url').in('discord_id', hostIds),
    supabase
      .from('event_participants')
      .select('event_id, discord_id, gamertag_snapshot')
      .in('event_id', eventIds),
    supabase
      .from('event_cars')
      .select(
        'event_id, car_id, max_pi, tune_share_code, car_restrictions, cars(id, make, model, year, pi, class)',
      )
      .in('event_id', eventIds),
  ]);

  const hostMap = new Map(hosts?.map((h) => [h.discord_id, h]) ?? []);
  const partMap = new Map<string, NonNullable<typeof parts>>();
  for (const p of parts ?? []) {
    const list = partMap.get(p.event_id) ?? [];
    list.push(p);
    partMap.set(p.event_id, list);
  }

  const carsMap = new Map<string, NonNullable<typeof eventCars>>();
  for (const ec of eventCars ?? []) {
    const list = carsMap.get(ec.event_id) ?? [];
    list.push(ec);
    carsMap.set(ec.event_id, list);
  }

  return rows.map((row) => {
    const host = hostMap.get(row.host_discord_id);
    const enriched: DbEventRow = {
      ...row,
      users: host ? {username: host.username, avatar_url: host.avatar_url} : null,
      event_participants: (partMap.get(row.id) ?? []).map((p) => ({
        discord_id: p.discord_id,
        gamertag_snapshot: p.gamertag_snapshot,
      })),
    };
    const event = mapDbEvent(enriched);
    const ecs = carsMap.get(row.id) ?? [];
    event.allowedCars = ecs
      .map((ec) => {
        const raw = ec.cars;
        const car = (Array.isArray(raw) ? raw[0] : raw) as {
          id: string;
          make: string;
          model: string;
          year: number | null;
          pi: number;
          class: string;
        } | null;
        if (!car?.id) return null;
        return {
          carId: car.id,
          make: car.make,
          model: car.model,
          year: car.year,
          pi: car.pi,
          class: car.class,
          maxPi: ec.max_pi ?? car.pi,
          tuneShareCode: ec.tune_share_code ?? undefined,
          restrictions: ec.car_restrictions ?? [],
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
    return event;
  });
}

export type FetchEventsOptions = {
  /** Include completed/cancelled/archived (for My Events & Profile). Default false for Browse. */
  includeCompleted?: boolean;
};

export function isEventCompleted(event: ForzaEvent): boolean {
  return event.status === 'ended';
}

export function isBrowsableEvent(event: ForzaEvent): boolean {
  return !isEventCompleted(event);
}

export async function fetchPublishedEvents(
  guildId?: string,
  options: FetchEventsOptions = {},
): Promise<ForzaEvent[]> {
  const {includeCompleted = false} = options;

  if (!isSupabaseConfigured()) {
    const list = [...MOCK_EVENTS];
    return includeCompleted ? list : list.filter(isBrowsableEvent);
  }

  const supabase = getSupabase()!;
  let query = supabase.from('events').select('*').neq('status', 'draft').order('starts_at', {ascending: true});

  if (!includeCompleted) {
    query = query.in('status', ['open', 'checkin', 'live']);
  }

  if (guildId) query = query.eq('guild_id', guildId);

  const {data, error} = await query;
  if (error) {
    console.error('fetchPublishedEvents', error);
    return [...MOCK_EVENTS];
  }
  return hydrateEvents((data ?? []) as DbEventRow[]);
}

export async function fetchEventById(id: string): Promise<ForzaEvent | undefined> {
  if (!isSupabaseConfigured()) {
    return MOCK_EVENTS.find((e) => e.id === id);
  }

  const supabase = getSupabase()!;
  const {data, error} = await supabase.from('events').select('*').eq('id', id).maybeSingle();

  if (error || !data) {
    return MOCK_EVENTS.find((e) => e.id === id);
  }
  const [event] = await hydrateEvents([data as DbEventRow]);
  return event;
}

export function eventHasStarted(event: ForzaEvent): boolean {
  if (event.status === 'live' || event.status === 'ended') return true;
  return new Date(event.startsAt).getTime() <= Date.now();
}

export function canSubmitEventResults(event: ForzaEvent, user: AppUser): boolean {
  return event.hostDiscordId === user.discordId && eventHasStarted(event);
}

export async function fetchEventResults(eventId: string): Promise<EventResultRow[]> {
  if (!isSupabaseConfigured()) return MOCK_EVENT_RESULTS[eventId] ?? [];

  const supabase = getSupabase()!;
  const {data, error} = await supabase
    .from('event_results')
    .select('discord_id, position, dnf, points')
    .eq('event_id', eventId)
    .order('position', {ascending: true});

  if (error) {
    console.error('fetchEventResults', error);
    return [];
  }

  return (data ?? []).map((r) => ({
    discordId: r.discord_id,
    position: r.position,
    dnf: r.dnf ?? false,
    points: r.points,
  }));
}

export type CarSearchResult = {
  id: string;
  make: string;
  model: string;
  year: number | null;
  pi: number;
  class: CarClassLetter;
};

export async function searchCars(query: string): Promise<CarSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  if (!isSupabaseConfigured()) {
    return searchCarCatalog(q);
  }

  const supabase = getSupabase()!;
  const {data, error} = await supabase
    .from('cars')
    .select('id, make, model, year, pi, class')
    .eq('active', true)
    .ilike('search_text', `%${q}%`)
    .limit(20);

  if (error) {
    console.error('searchCars', error);
    return searchCarCatalog(q);
  }

  if (!data?.length) {
    return searchCarCatalog(q);
  }

  return data.map((c) => ({
    id: c.id,
    make: c.make,
    model: c.model,
    year: c.year,
    pi: c.pi,
    class: c.class as CarClassLetter,
  }));
}

export function userIsJoined(event: ForzaEvent, user: AppUser): boolean {
  return event.participants.some((p) => p.discordId === user.discordId);
}

export {EVENT_PLAYER_SLOTS};
