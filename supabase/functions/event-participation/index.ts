import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {API_ERROR_CODES} from '../_shared/apiErrorCodes.ts';
import {appErrorResponse, internalErrorResponse} from '../_shared/apiResponse.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {verifyDiscordToken} from '../_shared/discord.ts';
import {ensureDiscordUserRow} from '../_shared/discordUserRow.ts';
import {syncPublishedEmbedByEventId} from '../_shared/embedSync.ts';
import {canLeaveEvent, eventHasStarted} from '../_shared/eventSpec.ts';
import {validateGamertag} from '../_shared/gamertag.ts';
import {rateLimitMutation} from '../_shared/rateLimitPresets.ts';
import {adminClient} from '../_shared/supabase.ts';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CLOSED_STATUSES = new Set(['completed', 'cancelled', 'archived']);

function participationError(
  req: Request,
  error: {message?: string},
  fallback: string,
): Response {
  const msg = error.message ?? fallback;
  if (msg.includes('EVENT_FULL')) {
    return appErrorResponse(req, 409, API_ERROR_CODES.EVENT_FULL);
  }
  if (msg.includes('EVENT_NOT_FOUND')) {
    return appErrorResponse(req, 404, API_ERROR_CODES.EVENT_NOT_FOUND);
  }
  if (msg.includes('foreign key') && msg.includes('users')) {
    return jsonResponse({error: 'Complete sign-in before joining events'}, 400, req);
  }
  return jsonResponse({error: msg}, 500, req);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST') return jsonResponse({error: 'Method not allowed'}, 405, req);

  const token =
    req.headers.get('x-discord-access-token') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const discordUser = await verifyDiscordToken(token);
  if (!discordUser) return jsonResponse({error: 'Unauthorized'}, 401, req);

  const mutationLimited = await rateLimitMutation(req, discordUser.id);
  if (mutationLimited) return mutationLimited;

  try {
    const {event_id, action, gamertag} = await req.json();
    if (!event_id || typeof event_id !== 'string' || !UUID_RE.test(event_id)) {
      return jsonResponse({error: 'Invalid event_id'}, 400, req);
    }
    if (!action || typeof action !== 'string') {
      return jsonResponse({error: 'Missing action'}, 400, req);
    }

    const supabase = adminClient();

    if (action === 'leave') {
      const {data: participant} = await supabase
        .from('event_participants')
        .select('is_convoy_leader')
        .eq('event_id', event_id)
        .eq('discord_id', discordUser.id)
        .maybeSingle();

      if (participant?.is_convoy_leader) {
        return appErrorResponse(req, 400, API_ERROR_CODES.LEADER_CANNOT_LEAVE);
      }

      const {data: event} = await supabase
        .from('events')
        .select('status, starts_at')
        .eq('id', event_id)
        .maybeSingle();

      if (!event || event.status === 'draft') {
        return appErrorResponse(req, 404, API_ERROR_CODES.EVENT_NOT_FOUND);
      }
      if (!canLeaveEvent(event)) {
        return jsonResponse(
          {error: 'Cannot leave after the event has started. Contact the host if you cannot attend.'},
          400,
          req,
        );
      }

      const {data: removed, error} = await supabase
        .from('event_participants')
        .delete()
        .eq('event_id', event_id)
        .eq('discord_id', discordUser.id)
        .select('discord_id');

      if (error) return participationError(req, error, 'Could not leave event');

      if (removed?.length) {
        await syncPublishedEmbedByEventId(supabase, event_id);
      }
      return jsonResponse({joined: false}, 200, req);
    }

    if (action === 'join') {
      const tag = validateGamertag(gamertag);
      if (!tag.ok) return jsonResponse({error: tag.error}, 400, req);

      const {data: event} = await supabase
        .from('events')
        .select('max_players, current_players, status, starts_at, host_discord_id')
        .eq('id', event_id)
        .single();

      if (!event || event.status === 'draft') {
        return appErrorResponse(req, 404, API_ERROR_CODES.EVENT_NOT_FOUND);
      }
      if (event.host_discord_id === discordUser.id) {
        return appErrorResponse(req, 400, API_ERROR_CODES.HOST_CANNOT_JOIN);
      }
      if (CLOSED_STATUSES.has(event.status)) {
        return appErrorResponse(req, 400, API_ERROR_CODES.REGISTRATION_CLOSED);
      }
      if (eventHasStarted(event)) {
        return appErrorResponse(req, 400, API_ERROR_CODES.REGISTRATION_AFTER_START);
      }
      if (event.current_players >= event.max_players) {
        return appErrorResponse(req, 409, API_ERROR_CODES.EVENT_FULL);
      }

      await ensureDiscordUserRow(supabase, discordUser);

      const {error: profileErr} = await supabase
        .from('users')
        .update({xbox_gamertag: tag.gamertag})
        .eq('discord_id', discordUser.id);
      if (profileErr) return jsonResponse({error: profileErr.message}, 500, req);

      const {data: existing} = await supabase
        .from('event_participants')
        .select('is_convoy_leader, participation_source')
        .eq('event_id', event_id)
        .eq('discord_id', discordUser.id)
        .maybeSingle();

      // Preserve host-managed sources; a voluntary join from a non-leader row becomes self_join.
      const participationSource: string =
        existing?.participation_source === 'host_assigned' ||
        existing?.participation_source === 'host_self_assigned'
          ? existing.participation_source
          : 'self_join';

      const {error} = await supabase.from('event_participants').upsert(
        {
          event_id,
          discord_id: discordUser.id,
          gamertag_snapshot: tag.gamertag,
          waitlisted: false,
          is_convoy_leader: existing?.is_convoy_leader ?? false,
          participation_source: participationSource,
        },
        {onConflict: 'event_id,discord_id'},
      );

      if (error) return participationError(req, error, 'Could not join event');

      await syncPublishedEmbedByEventId(supabase, event_id);
      return jsonResponse({joined: true}, 200, req);
    }

    return jsonResponse({error: 'Unknown action'}, 400, req);
  } catch (e) {
    return internalErrorResponse(req, e);
  }
});
