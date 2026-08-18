import {isEventUuid} from '@edge/eventPath.ts';
import {invokeBrowseEvents} from './api';
import {getSupabase, isSupabaseConfigured} from './supabase';
import {canUsePostgrestReads, shouldUseDirectSupabaseReads} from './supabaseEnv';

export type ParticipantEventResult = {
  position: number | null;
  dnf: boolean;
  dns: boolean;
  ratingDelta?: number | null;
};

const EDGE_ID_CHUNK = 60;

type BrowseResultRow = {
  id: string;
  event_results?: {
    discord_id: string;
    position: number | null;
    dnf?: boolean | null;
    dns?: boolean | null;
  }[];
  rating_ledger?: {discord_id: string; delta: number}[];
};

function asBrowseResultRow(value: unknown): BrowseResultRow | null {
  if (!value || typeof value !== 'object') return null;
  const id = (value as {id?: unknown}).id;
  if (typeof id !== 'string') return null;
  return value as BrowseResultRow;
}

/** Map browse-events `{event_ids}` rows (or detail payload) onto one viewer's finishes. */
export function participantResultsFromBrowseRows(
  rows: unknown[],
  discordId: string,
): Map<string, ParticipantEventResult> {
  const map = new Map<string, ParticipantEventResult>();
  if (!discordId.trim()) return map;

  for (const raw of rows) {
    const row = asBrowseResultRow(raw);
    if (!row?.event_results) continue;
    const mine = row.event_results.find((result) => result.discord_id === discordId);
    if (!mine) continue;
    const delta = row.rating_ledger?.find((entry) => entry.discord_id === discordId)?.delta;
    map.set(row.id, {
      position: mine.position,
      dnf: mine.dnf ?? false,
      dns: mine.dns ?? false,
      ratingDelta: delta ?? null,
    });
  }
  return map;
}

async function fetchParticipantResultsViaPostgrest(
  eventIds: string[],
  discordId: string,
): Promise<Map<string, ParticipantEventResult>> {
  const supabase = (await getSupabase())!;
  const [results, ledger] = await Promise.all([
    supabase
      .from('event_results')
      .select('event_id, position, dnf, dns')
      .in('event_id', eventIds)
      .eq('discord_id', discordId),
    supabase
      .from('rating_ledger')
      .select('event_id, delta')
      .in('event_id', eventIds)
      .eq('discord_id', discordId),
  ]);

  if (results.error) {
    console.error('fetchParticipantResultsMap', results.error);
    return new Map();
  }
  if (ledger.error) {
    console.error('fetchParticipantResultsMap ledger', ledger.error);
  }

  const map = new Map<string, ParticipantEventResult>();
  for (const row of results.data ?? []) {
    map.set(row.event_id, {
      position: row.position,
      dnf: row.dnf ?? false,
      dns: row.dns ?? false,
    });
  }
  for (const row of ledger.data ?? []) {
    const existing = map.get(row.event_id);
    if (existing) existing.ratingDelta = row.delta;
  }
  return map;
}

async function fetchParticipantResultsViaEdge(
  eventIds: string[],
  discordId: string,
): Promise<Map<string, ParticipantEventResult> | null> {
  try {
    const map = new Map<string, ParticipantEventResult>();
    for (let i = 0; i < eventIds.length; i += EDGE_ID_CHUNK) {
      const chunk = eventIds.slice(i, i + EDGE_ID_CHUNK);
      const {data} = await invokeBrowseEvents({event_ids: chunk, include_completed: true});
      const rows = data ?? [];
      // Old browse-events ignores event_ids and returns the list select (no nest).
      if (rows.length > 0 && !rows.some((row) => asBrowseResultRow(row)?.event_results !== undefined)) {
        return null;
      }
      for (const [id, result] of participantResultsFromBrowseRows(rows, discordId)) {
        map.set(id, result);
      }
    }
    return map;
  } catch (err) {
    console.error('fetchParticipantResultsMap edge', err);
    return null;
  }
}

/** Published result row for the current user on one or more events (My Events / Profile history). */
export async function fetchParticipantResultsMap(
  eventIds: string[],
  discordId: string,
): Promise<Map<string, ParticipantEventResult>> {
  const uniqueIds = [...new Set(eventIds.filter((id) => id && isEventUuid(id)))];
  if (!uniqueIds.length || !discordId.trim() || !isSupabaseConfigured()) {
    return new Map();
  }

  if (shouldUseDirectSupabaseReads()) {
    return fetchParticipantResultsViaPostgrest(uniqueIds, discordId);
  }

  const fromEdge = await fetchParticipantResultsViaEdge(uniqueIds, discordId);
  if (fromEdge) return fromEdge;
  if (!canUsePostgrestReads()) return new Map();
  return fetchParticipantResultsViaPostgrest(uniqueIds, discordId);
}
