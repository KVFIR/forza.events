/** Apply pairwise ELO after ranked submit-results (per group). */

import type {adminClient} from './supabase.ts';
import {
  ELO_DEFAULT,
  computePairwiseElo,
  planRatedGroupOrders,
  type PlayerRatingState,
  type RatingDelta,
  type ResultRowForRating,
} from './rating.ts';

type Supabase = ReturnType<typeof adminClient>;

export async function isGuildRatingEnabled(
  supabase: Supabase,
  guildId: string | null | undefined,
): Promise<boolean> {
  const id = guildId?.trim();
  if (!id) return false;
  const {data} = await supabase
    .from('rating_enabled_guilds')
    .select('guild_id')
    .eq('guild_id', id)
    .maybeSingle();
  return Boolean(data?.guild_id);
}

/**
 * Compute pairwise deltas in Edge, then persist via one Postgres RPC
 * (ratings + ledger + rating_applied in a single transaction).
 */
export async function applyRankedEventRatings(
  supabase: Supabase,
  eventId: string,
  resultRows: ResultRowForRating[],
): Promise<RatingDelta[]> {
  const groupOrders = planRatedGroupOrders(resultRows);
  if (groupOrders.length === 0) {
    const {error} = await supabase.rpc('apply_event_rating_deltas', {
      p_event_id: eventId,
      p_deltas: [],
    });
    if (error) throw error;
    return [];
  }

  const allIds = [...new Set(groupOrders.flat())];
  const {data: existing} = await supabase
    .from('player_ratings')
    .select('discord_id, rating, games_rated')
    .in('discord_id', allIds);

  const states = new Map<string, PlayerRatingState>();
  for (const id of allIds) {
    const row = existing?.find((r) => r.discord_id === id);
    states.set(id, {
      discordId: id,
      rating: row?.rating ?? ELO_DEFAULT,
      gamesRated: row?.games_rated ?? 0,
    });
  }

  // Snapshot: every group uses pre-event ratings (not sequential mid-event updates).
  const deltas: RatingDelta[] = [];
  for (const ordered of groupOrders) {
    deltas.push(...computePairwiseElo(ordered, states));
  }

  const payload = deltas.map((d) => {
    const prev = states.get(d.discordId);
    return {
      discord_id: d.discordId,
      rating_before: d.ratingBefore,
      rating_after: d.ratingAfter,
      delta: d.delta,
      games_rated: (prev?.gamesRated ?? 0) + 1,
    };
  });

  const {error} = await supabase.rpc('apply_event_rating_deltas', {
    p_event_id: eventId,
    p_deltas: payload,
  });
  if (error) throw error;

  return deltas;
}
