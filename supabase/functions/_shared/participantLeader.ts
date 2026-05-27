import type {adminClient} from './supabase.ts';
import type {ResolvedLobbyLeader} from './lobbyLeader.ts';

export type ParticipationSource = 'self_join' | 'host_assigned' | 'host_self_assigned';

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
