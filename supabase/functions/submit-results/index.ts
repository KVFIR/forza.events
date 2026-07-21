import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {API_ERROR_CODES} from '../_shared/apiErrorCodes.ts';
import {appErrorResponse, internalErrorResponse} from '../_shared/apiResponse.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {applyRankedEventRatings} from '../_shared/applyEventRatings.ts';
import {syncPublishedEmbedByEventId} from '../_shared/embedSync.ts';
import {requireDiscordUser} from '../_shared/discordRequestAuth.ts';
import {eventHasStarted} from '../_shared/eventSpec.ts';
import {validateResultSubmitRow} from '../_shared/eventResults.ts';
import {allowedResultDiscordIds} from '../_shared/resultsRoster.ts';
import {responseForRpcError} from '../_shared/rpcErrors.ts';
import {rateLimitMutation} from '../_shared/rateLimitPresets.ts';
import {adminClient} from '../_shared/supabase.ts';

type ResultInput = {
  discord_id: string;
  position: number | null;
  dnf?: boolean;
  dns?: boolean;
};

type RatingDeltaJson = {
  discord_id: string;
  rating_before: number;
  rating_after: number;
  delta: number;
};

function toRatingDeltaJson(
  deltas: {
    discordId: string;
    ratingBefore: number;
    ratingAfter: number;
    delta: number;
  }[],
): RatingDeltaJson[] {
  return deltas.map((d) => ({
    discord_id: d.discordId,
    rating_before: d.ratingBefore,
    rating_after: d.ratingAfter,
    delta: d.delta,
  }));
}

async function tryApplyRatings(
  supabase: ReturnType<typeof adminClient>,
  eventId: string,
  rows: {
    discord_id: string;
    position: number | null;
    dnf: boolean;
    dns: boolean;
    group_index: number;
  }[],
): Promise<{deltas: RatingDeltaJson[]; applied: boolean}> {
  try {
    const deltas = await applyRankedEventRatings(supabase, eventId, rows);
    return {deltas: toRatingDeltaJson(deltas), applied: true};
  } catch (ratingErr) {
    console.error(
      JSON.stringify({
        msg: 'Results saved but rating apply failed',
        eventId,
        error: ratingErr instanceof Error ? ratingErr.message : String(ratingErr),
      }),
    );
    return {deltas: [], applied: false};
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST') return jsonResponse({error: 'Method not allowed'}, 405, req);

  const auth = await requireDiscordUser(req);
  if (auth instanceof Response) return auth;
  const {user: discordUser} = auth;

  const mutationLimited = await rateLimitMutation(req, discordUser.id);
  if (mutationLimited) return mutationLimited;

  try {
    const body = await req.json();
    const eventId = body.event_id as string;
    const results = (body.results ?? []) as ResultInput[];

    if (!eventId) return jsonResponse({error: 'Missing event_id'}, 400, req);

    const supabase = adminClient();
    const {data: event} = await supabase
      .from('events')
      .select('host_discord_id, starts_at, status, is_ranked, rating_applied')
      .eq('id', eventId)
      .single();

    if (!event) return jsonResponse({error: 'Event not found'}, 404, req);
    if (event.host_discord_id !== discordUser.id) {
      return jsonResponse({error: 'Forbidden'}, 403, req);
    }
    if (!eventHasStarted(event)) {
      return jsonResponse({error: 'Event has not started yet'}, 400, req);
    }

    // Rating-only retry: results already saved, ELO apply failed earlier.
    if (
      event.status === 'completed' &&
      event.is_ranked &&
      !event.rating_applied
    ) {
      const {data: saved} = await supabase
        .from('event_results')
        .select('discord_id, position, dnf, dns, group_index')
        .eq('event_id', eventId);
      const rows = (saved ?? []).map((r) => ({
        discord_id: String(r.discord_id),
        position: r.position as number | null,
        dnf: Boolean(r.dnf),
        dns: Boolean(r.dns),
        group_index: Number(r.group_index ?? 1),
      }));
      const rating = await tryApplyRatings(supabase, eventId, rows);
      return jsonResponse(
        {
          ok: true,
          embed_synced: true,
          rating_deltas: rating.deltas,
          rating_applied: rating.applied,
          rating_retried: true,
        },
        200,
        req,
      );
    }

    if (['completed', 'cancelled', 'archived'].includes(event.status)) {
      return appErrorResponse(req, 409, API_ERROR_CODES.RESULTS_ALREADY_SUBMITTED);
    }

    if (!Array.isArray(results) || results.length === 0) {
      return jsonResponse({error: 'Add at least one result'}, 400, req);
    }

    const {data: participants} = await supabase
      .from('event_participants')
      .select('discord_id, gamertag_snapshot, group_index, waitlisted')
      .eq('event_id', eventId);
    const allowedIds = allowedResultDiscordIds(participants ?? []);
    // Positions are unique per group — derive each racer's group from their roster row.
    const groupById = new Map(
      (participants ?? []).map((p) => [String(p.discord_id), p.group_index ?? 1]),
    );

    const finisherPositionsByGroup = new Map<number, Set<number>>();

    for (const r of results) {
      if (!allowedIds.has(String(r.discord_id))) {
        return appErrorResponse(req, 400, API_ERROR_CODES.RESULTS_PARTICIPANTS_ONLY);
      }
      const rowErr = validateResultSubmitRow(r);
      if (rowErr) return jsonResponse({error: rowErr}, 400, req);
      if (r.position != null) {
        const group = groupById.get(String(r.discord_id)) ?? 1;
        let seen = finisherPositionsByGroup.get(group);
        if (!seen) {
          seen = new Set<number>();
          finisherPositionsByGroup.set(group, seen);
        }
        if (seen.has(r.position)) {
          return jsonResponse({error: 'Duplicate finishing position'}, 400, req);
        }
        seen.add(r.position);
      }
    }

    const rows = results.map((r) => ({
      discord_id: r.discord_id,
      position: r.position,
      dnf: r.dnf ?? false,
      dns: r.dns ?? false,
      group_index: groupById.get(String(r.discord_id)) ?? 1,
    }));

    const {error: rpcError} = await supabase.rpc('submit_event_results', {
      p_event_id: eventId,
      p_host_discord_id: discordUser.id,
      p_results: rows,
    });

    if (rpcError) {
      return responseForRpcError(req, rpcError);
    }

    let ratingDeltas: RatingDeltaJson[] = [];
    let ratingApplied = !event.is_ranked;
    if (event.is_ranked && !event.rating_applied) {
      const rating = await tryApplyRatings(supabase, eventId, rows);
      ratingDeltas = rating.deltas;
      ratingApplied = rating.applied;
    }

    const embedSync = await syncPublishedEmbedByEventId(supabase, eventId);
    if (!embedSync.ok) {
      console.error(
        JSON.stringify({
          msg: 'Results saved but Discord embed sync failed',
          eventId,
          status: embedSync.status,
        }),
      );
    }

    return jsonResponse(
      {
        ok: true,
        embed_synced: embedSync.ok,
        rating_deltas: ratingDeltas,
        rating_applied: ratingApplied,
      },
      200,
      req,
    );
  } catch (e) {
    return internalErrorResponse(req, e);
  }
});
