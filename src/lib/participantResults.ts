import {getSupabase, isSupabaseConfigured} from './supabase';

export type ParticipantEventResult = {
  position: number | null;
  dnf: boolean;
  dns: boolean;
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
  const {data, error} = await supabase
    .from('event_results')
    .select('event_id, position, dnf, dns')
    .in('event_id', uniqueIds)
    .eq('discord_id', discordId);

  if (error) {
    console.error('fetchParticipantResultsMap', error);
    return new Map();
  }

  const map = new Map<string, ParticipantEventResult>();
  for (const row of data ?? []) {
    map.set(row.event_id, {
      position: row.position,
      dnf: row.dnf ?? false,
      dns: row.dns ?? false,
    });
  }
  return map;
}
