import {getSupabase, isSupabaseConfigured} from './supabase';

export type ParticipantEventResult = {
  position: number | null;
  dnf: boolean;
  dns: boolean;
  ratingDelta?: number | null;
};

/** Published result row for the current user on one or more events (My Events / Profile history). */
export async function fetchParticipantResultsMap(
  eventIds: string[],
  discordId: string,
): Promise<Map<string, ParticipantEventResult>> {
  const uniqueIds = [...new Set(eventIds.filter(Boolean))];
  if (!uniqueIds.length || !discordId.trim() || !isSupabaseConfigured()) {
    return new Map();
  }

  const supabase = (await getSupabase())!;
  const [results, ledger] = await Promise.all([
    supabase
      .from('event_results')
      .select('event_id, position, dnf, dns')
      .in('event_id', uniqueIds)
      .eq('discord_id', discordId),
    supabase
      .from('rating_ledger')
      .select('event_id, delta')
      .in('event_id', uniqueIds)
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
