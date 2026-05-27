import {ensureUserRowForDiscordId} from './discordUserRow.ts';
import type {adminClient} from './supabase.ts';
import type {ResolvedLobbyLeader} from './lobbyLeader.ts';

export type ParticipationSource = 'self_join' | 'host_assigned' | 'host_self_assigned';

const SYSTEM_PARTICIPATION_SOURCES: ParticipationSource[] = [
  'host_assigned',
  'host_self_assigned',
];

type ParticipantPruneRow = {
  discord_id: string;
  participation_source: string;
  is_convoy_leader: boolean;
};

/** Drop host-placed racer rows left behind after convoy leader changes. */
export function shouldPruneSystemParticipant(
  row: ParticipantPruneRow,
  newLeaderDiscordId: string,
): boolean {
  if (row.discord_id === newLeaderDiscordId) return false;
  if (row.is_convoy_leader) return false;
  return SYSTEM_PARTICIPATION_SOURCES.includes(
    row.participation_source as ParticipationSource,
  );
}

type EventLeaderRow = {
  id: string;
  host_discord_id: string;
  lobby_leader_discord_id?: string | null;
  lobby_leader_is_host?: boolean | null;
  lobby_leader_gamertag?: string | null;
};

/** Resolve leader fields stored on `events` (denormalized). */
export function leaderFromEventRow(
  event: Omit<EventLeaderRow, 'id'>,
): ResolvedLobbyLeader | null {
  const gamertag = event.lobby_leader_gamertag?.trim();
  if (!gamertag) return null;

  const isHost = event.lobby_leader_is_host !== false;
  const discordId = isHost
    ? event.host_discord_id
    : event.lobby_leader_discord_id?.trim();
  if (!discordId) return null;

  return {
    lobby_leader_discord_id: discordId,
    lobby_leader_is_host: isHost,
    lobby_leader_gamertag: gamertag,
  };
}

/** Upsert convoy leader participant row and refresh `events.current_players`. */
export async function ensureConvoyLeaderParticipantForEvent(
  supabase: ReturnType<typeof adminClient>,
  event: EventLeaderRow,
  profile?: {username?: string | null; avatar_url?: string | null},
): Promise<void> {
  const leader = leaderFromEventRow(event);
  if (!leader) return;

  await ensureUserRowForDiscordId(supabase, leader.lobby_leader_discord_id, profile);
  await syncConvoyLeaderParticipant(supabase, event.id, leader);
  await recalculateEventPlayerCount(supabase, event.id);
}

/** Clear leader flag on all rows, then upsert the designated leader participant. */
export async function syncConvoyLeaderParticipant(
  supabase: ReturnType<typeof adminClient>,
  eventId: string,
  leader: ResolvedLobbyLeader,
): Promise<void> {
  await supabase
    .from('event_participants')
    .update({is_convoy_leader: false})
    .eq('event_id', eventId)
    .eq('is_convoy_leader', true);

  const {data: existing} = await supabase
    .from('event_participants')
    .select('participation_source')
    .eq('event_id', eventId)
    .eq('discord_id', leader.lobby_leader_discord_id)
    .maybeSingle();

  const defaultSource: ParticipationSource = leader.lobby_leader_is_host
    ? 'host_self_assigned'
    : 'host_assigned';

  const participationSource: ParticipationSource =
    existing?.participation_source === 'self_join' ? 'self_join' : defaultSource;

  const {error} = await supabase.from('event_participants').upsert(
    {
      event_id: eventId,
      discord_id: leader.lobby_leader_discord_id,
      gamertag_snapshot: leader.lobby_leader_gamertag,
      is_convoy_leader: true,
      participation_source: participationSource,
      waitlisted: false,
    },
    {onConflict: 'event_id,discord_id'},
  );

  if (error) {
    throw new Error(`Failed to sync convoy leader participant: ${error.message}`);
  }

  await pruneOrphanSystemLeaderParticipants(supabase, eventId, leader.lobby_leader_discord_id);
}

/** Remove prior host-assigned / host-self rows that are no longer the convoy leader. */
async function pruneOrphanSystemLeaderParticipants(
  supabase: ReturnType<typeof adminClient>,
  eventId: string,
  newLeaderDiscordId: string,
): Promise<void> {
  const {data: rows, error: loadErr} = await supabase
    .from('event_participants')
    .select('discord_id, participation_source, is_convoy_leader')
    .eq('event_id', eventId)
    .in('participation_source', SYSTEM_PARTICIPATION_SOURCES);

  if (loadErr) {
    throw new Error(`Failed to load participants for leader prune: ${loadErr.message}`);
  }

  const orphanIds = (rows ?? [])
    .filter((row) => shouldPruneSystemParticipant(row, newLeaderDiscordId))
    .map((row) => row.discord_id);

  if (!orphanIds.length) return;

  const {error: deleteErr} = await supabase
    .from('event_participants')
    .delete()
    .eq('event_id', eventId)
    .in('discord_id', orphanIds);

  if (deleteErr) {
    throw new Error(`Failed to prune orphan leader participants: ${deleteErr.message}`);
  }
}

export async function recalculateEventPlayerCount(
  supabase: ReturnType<typeof adminClient>,
  eventId: string,
): Promise<void> {
  const {count, error: countErr} = await supabase
    .from('event_participants')
    .select('discord_id', {count: 'exact', head: true})
    .eq('event_id', eventId)
    .or('waitlisted.eq.false,waitlisted.is.null');

  if (countErr) {
    throw new Error(`Failed to count participants: ${countErr.message}`);
  }

  const {error} = await supabase
    .from('events')
    .update({current_players: count ?? 0})
    .eq('id', eventId);

  if (error) {
    throw new Error(`Failed to update current_players: ${error.message}`);
  }
}
