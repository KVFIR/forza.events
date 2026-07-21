import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {API_ERROR_CODES} from '../_shared/apiErrorCodes.ts';
import {appErrorResponse, internalErrorResponse} from '../_shared/apiResponse.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {requireDiscordUser} from '../_shared/discordRequestAuth.ts';
import {syncPublishedEmbedByEventId} from '../_shared/embedSync.ts';
import {
  netGroupMovePlans,
  planGroupBalance,
  planGroupBalanceShuffle,
  planGroupShuffle,
} from '../_shared/eventGroups.ts';
import {responseForRpcError} from '../_shared/rpcErrors.ts';
import {rateLimitMutation} from '../_shared/rateLimitPresets.ts';
import {deferNotificationDelivery} from '../_shared/notifications.ts';
import {enqueueGroupReassigned} from '../_shared/notificationTriggers.ts';
import {adminClient} from '../_shared/supabase.ts';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CLOSED_STATUSES = new Set(['completed', 'cancelled', 'archived']);

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
    const eventId = body.event_id;
    if (!eventId || typeof eventId !== 'string' || !UUID_RE.test(eventId)) {
      return jsonResponse({error: 'Invalid event_id'}, 400, req);
    }

    const supabase = adminClient();
    const {data: event} = await supabase
      .from('events')
      .select(
        'host_discord_id, status, starts_at, group_count, max_players, title, timezone_hint',
      )
      .eq('id', eventId)
      .single();

    if (!event || event.status === 'draft') {
      return appErrorResponse(req, 404, API_ERROR_CODES.EVENT_NOT_FOUND);
    }
    if (event.host_discord_id !== discordUser.id) {
      return appErrorResponse(req, 403, API_ERROR_CODES.FORBIDDEN);
    }
    if (CLOSED_STATUSES.has(event.status)) {
      return appErrorResponse(req, 400, API_ERROR_CODES.REGISTRATION_CLOSED);
    }
    // After start is allowed until finalized (CLOSED_STATUSES); join/edit stay locked elsewhere.

    const groupCount = event.group_count ?? 1;
    if (groupCount < 2) {
      return appErrorResponse(req, 400, API_ERROR_CODES.BAD_REQUEST);
    }

    const mode =
      body.mode === 'shuffle'
        ? 'shuffle'
        : body.mode === 'balance_shuffle'
          ? 'balance_shuffle'
          : 'balance';

    const {data: roster} = await supabase
      .from('event_participants')
      .select('discord_id, group_index, waitlisted, is_convoy_leader, joined_at')
      .eq('event_id', eventId);

    const rosterRows = roster ?? [];
    const plan =
      mode === 'shuffle'
        ? planGroupShuffle(rosterRows, groupCount, event.max_players)
        : mode === 'balance_shuffle'
          ? planGroupBalanceShuffle(rosterRows, groupCount, event.max_players)
          : planGroupBalance(rosterRows, groupCount, event.max_players);
    if (!plan.length) {
      return jsonResponse({ok: true, unchanged: true, moved: []}, 200, req);
    }

    const {data: moved, error: rpcErr} = await supabase.rpc('apply_event_group_moves', {
      p_event_id: eventId,
      p_moves: plan.map((m) => ({discord_id: m.discord_id, group_index: m.to_group})),
    });
    if (rpcErr) return responseForRpcError(req, rpcErr);

    const moves = Array.isArray(moved) ? moved : [];
    if (!moves.length) {
      return jsonResponse({ok: true, unchanged: true, moved: []}, 200, req);
    }

    const {data: rosterAfter} = await supabase
      .from('event_participants')
      .select('discord_id, group_index, waitlisted, is_convoy_leader, gamertag_snapshot')
      .eq('event_id', eventId);

    const eventRow = {
      id: eventId,
      title: event.title,
      host_discord_id: event.host_discord_id,
      max_players: event.max_players,
      group_count: event.group_count,
      starts_at: event.starts_at,
      timezone: event.timezone_hint,
    };

    const normalized = moves.map((m: {discord_id: string; from_group: number; to_group: number}) => ({
      discord_id: String(m.discord_id),
      from_group: Number(m.from_group),
      to_group: Number(m.to_group),
    }));
    // balance_shuffle applies two hops; DMs use one original→final move per racer.
    const notified =
      mode === 'balance_shuffle' ? netGroupMovePlans(normalized) : normalized;

    await enqueueGroupReassigned(
      supabase,
      eventRow,
      rosterAfter ?? [],
      notified,
      crypto.randomUUID(),
    );
    deferNotificationDelivery(supabase);

    const embedSync = await syncPublishedEmbedByEventId(supabase, eventId);
    if (!embedSync.ok) {
      console.error(
        JSON.stringify({
          msg:
            mode === 'shuffle'
              ? 'Shuffled groups but Discord embed sync failed'
              : mode === 'balance_shuffle'
                ? 'Balanced and shuffled groups but Discord embed sync failed'
                : 'Balanced groups but Discord embed sync failed',
          eventId,
          status: embedSync.status,
        }),
      );
    }

    return jsonResponse(
      {ok: true, mode, moved: notified, embed_synced: embedSync.ok},
      200,
      req,
    );
  } catch (e) {
    return internalErrorResponse(req, e);
  }
});
