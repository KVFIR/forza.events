import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {API_ERROR_CODES} from '../_shared/apiErrorCodes.ts';
import {
  appErrorResponse,
  internalErrorResponse,
} from '../_shared/apiResponse.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {applyRankedEventRatings} from '../_shared/applyEventRatings.ts';
import {syncPublishedEmbedByEventId} from '../_shared/embedSync.ts';
import {
  avatarUrl,
  discordUniqueUsername,
  fetchDiscordUserById,
  isUserMemberOfGuild,
} from '../_shared/discord.ts';
import {requireDiscordUser} from '../_shared/discordRequestAuth.ts';
import {ensureUserRowForDiscordId} from '../_shared/discordUserRow.ts';
import {eventHasStarted} from '../_shared/eventSpec.ts';
import {validateResultSubmitRow} from '../_shared/eventResults.ts';
import {responseForRpcError} from '../_shared/rpcErrors.ts';
import {rateLimitMutation} from '../_shared/rateLimitPresets.ts';
import {adminClient} from '../_shared/supabase.ts';

type ResultInput = {
  discord_id: string;
  position: number | null;
  dnf?: boolean;
  dns?: boolean;
  group_index?: number;
  gamertag?: string;
};

type ParticipantRow = {
  discord_id: string;
  group_index: number | null;
  waitlisted: boolean | null;
  gamertag_snapshot: string | null;
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
        error:
          ratingErr instanceof Error ? ratingErr.message : String(ratingErr),
      }),
    );
    return {deltas: [], applied: false};
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST')
    return jsonResponse({error: 'Method not allowed'}, 405, req);

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
      .select(
        'host_discord_id, starts_at, status, is_ranked, rating_applied, type, guild_id, group_count, max_players',
      )
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
          embed_synced: false,
          rating_deltas: rating.deltas,
          rating_applied: rating.applied,
          rating_retried: true,
        },
        200,
        req,
      );
    }

    if (['completed', 'cancelled', 'archived'].includes(event.status)) {
      return appErrorResponse(
        req,
        409,
        API_ERROR_CODES.RESULTS_ALREADY_SUBMITTED,
      );
    }

    // Cruise: mark finished with no standings (social meetup, not a race).
    if (
      (!Array.isArray(results) || results.length === 0) &&
      event.type === 'cruise'
    ) {
      const {data: completed, error: completeErr} = await supabase
        .from('events')
        .update({status: 'completed'})
        .eq('id', eventId)
        .eq('host_discord_id', discordUser.id)
        .not('status', 'in', '(completed,cancelled,archived,draft)')
        .select('id')
        .maybeSingle();
      if (completeErr) return internalErrorResponse(req, completeErr);
      if (!completed) {
        return appErrorResponse(
          req,
          409,
          API_ERROR_CODES.RESULTS_ALREADY_SUBMITTED,
        );
      }
      const embedSync = await syncPublishedEmbedByEventId(supabase, eventId);
      if (!embedSync.ok) {
        console.error(
          JSON.stringify({
            msg: 'Cruise completed but Discord embed sync failed',
            eventId,
            status: embedSync.status,
          }),
        );
      }
      return jsonResponse(
        {
          ok: true,
          embed_synced: embedSync.ok,
          rating_deltas: [],
          rating_applied: true,
        },
        200,
        req,
      );
    }

    if (!Array.isArray(results) || results.length === 0) {
      return jsonResponse({error: 'Add at least one result'}, 400, req);
    }

    if (event.type === 'cruise') {
      return jsonResponse(
        {error: 'Cruise events do not use race results'},
        400,
        req,
      );
    }

    const {data: participants} = await supabase
      .from('event_participants')
      .select('discord_id, gamertag_snapshot, group_index, waitlisted')
      .eq('event_id', eventId);
    const byParticipantId = new Map(
      ((participants ?? []) as ParticipantRow[]).map((p) => [
        String(p.discord_id),
        p,
      ]),
    );
    const groupCount = Number(event.group_count ?? 1);
    const groupById = new Map<string, number>();
    const guestIds: string[] = [];
    const seenIds = new Set<string>();
    const finisherPositionsByGroup = new Map<number, Set<number>>();
    const parsedMax = Number(event.max_players);
    const maxPlayers = Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : 12;

    for (const r of results) {
      const id = String(r.discord_id ?? '').trim();
      if (!id || seenIds.has(id)) {
        return jsonResponse({error: 'Duplicate or missing driver'}, 400, req);
      }
      seenIds.add(id);

      const existing = byParticipantId.get(id);
      let group: number;
      if (existing && !existing.waitlisted) {
        group = Number(existing.group_index ?? 1);
      } else {
        group = Number(r.group_index ?? 1);
        if (!Number.isInteger(group) || group < 1 || group > groupCount) {
          return appErrorResponse(req, 400, API_ERROR_CODES.BAD_REQUEST);
        }
        if (!existing) guestIds.push(id);
      }
      groupById.set(id, group);

      const rowErr = validateResultSubmitRow(r);
      if (rowErr) return jsonResponse({error: rowErr}, 400, req);
      if (r.position != null) {
        let seen = finisherPositionsByGroup.get(group);
        if (!seen) {
          seen = new Set<number>();
          finisherPositionsByGroup.set(group, seen);
        }
        if (seen.has(r.position)) {
          return jsonResponse(
            {error: 'Duplicate finishing position'},
            400,
            req,
          );
        }
        seen.add(r.position);
      }
    }

    if (guestIds.length > 0) {
      // ponytail: one extra full lobby of walk-ons; raise if hosts need more.
      if (guestIds.length > groupCount * maxPlayers) {
        return appErrorResponse(req, 400, API_ERROR_CODES.BAD_REQUEST);
      }
      const guildId = event.guild_id ? String(event.guild_id) : '';
      if (!guildId) {
        return appErrorResponse(
          req,
          400,
          API_ERROR_CODES.RESULTS_PARTICIPANTS_ONLY,
        );
      }
      for (const id of guestIds) {
        try {
          const inGuild = await isUserMemberOfGuild(guildId, id);
          if (!inGuild) {
            return appErrorResponse(
              req,
              400,
              API_ERROR_CODES.RESULTS_NOT_IN_GUILD,
            );
          }
        } catch (e) {
          const detail = String(e);
          console.error(
            JSON.stringify({
              msg: 'submit-results guild check failed',
              detail,
            }),
          );
          if (detail.toLowerCase().includes('rate limit')) {
            return appErrorResponse(
              req,
              429,
              API_ERROR_CODES.TOO_MANY_REQUESTS,
            );
          }
          if (detail.includes('Guild member lookup failed: 403')) {
            return appErrorResponse(
              req,
              503,
              API_ERROR_CODES.GUILD_MEMBER_SEARCH_DISABLED,
            );
          }
          return internalErrorResponse(req, e);
        }
      }
      for (const id of guestIds) {
        try {
          const user = await fetchDiscordUserById(id);
          await ensureUserRowForDiscordId(supabase, id, {
            username: discordUniqueUsername(user),
            avatar_url: avatarUrl(user),
          });
        } catch (e) {
          const detail = String(e);
          console.error(
            JSON.stringify({
              msg: 'submit-results guest profile failed',
              detail,
            }),
          );
          if (detail.includes('Discord user not found')) {
            return appErrorResponse(
              req,
              400,
              API_ERROR_CODES.RESULTS_NOT_IN_GUILD,
            );
          }
          if (detail.toLowerCase().includes('rate limit')) {
            return appErrorResponse(
              req,
              429,
              API_ERROR_CODES.TOO_MANY_REQUESTS,
            );
          }
          return internalErrorResponse(req, e);
        }
      }
    }

    const rows = results.map((r) => {
      const id = String(r.discord_id).trim();
      const existing = byParticipantId.get(id);
      const group = groupById.get(id) ?? 1;
      const tag = String(r.gamertag ?? '').trim();
      return {
        discord_id: id,
        position: r.position,
        dnf: r.dnf ?? false,
        dns: r.dns ?? false,
        group_index: group,
        ...((!existing || existing.waitlisted) && tag ? {gamertag: tag} : {}),
      };
    });

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
