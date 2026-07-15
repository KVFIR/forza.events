import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {API_ERROR_CODES} from '../_shared/apiErrorCodes.ts';
import {appErrorResponse, databaseErrorResponse, internalErrorResponse} from '../_shared/apiResponse.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {verifyDiscordToken} from '../_shared/discord.ts';
import {ensureDiscordUserRow} from '../_shared/discordUserRow.ts';
import {syncPublishedEmbedByEventId} from '../_shared/embedSync.ts';
import {canLeaveEvent, eventHasStarted} from '../_shared/eventSpec.ts';
import {firstOpenGroup} from '../_shared/eventGroups.ts';
import {validateGamertag} from '../_shared/gamertag.ts';
import {rateLimitMutation} from '../_shared/rateLimitPresets.ts';
import {responseForRpcError} from '../_shared/rpcErrors.ts';
import {deferNotificationDelivery} from '../_shared/notifications.ts';
import {
  shouldEnqueueHostGroupFilledOnJoin,
  shouldEnqueueHostGroupFilledOnPromote,
} from '../_shared/notificationParticipation.ts';
import {
  enqueueHostGroupFilled,
  enqueueWaitlistSeatOpened,
} from '../_shared/notificationTriggers.ts';
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
  if (msg.includes('foreign key') && msg.includes('users')) {
    return appErrorResponse(req, 400, API_ERROR_CODES.PROFILE_INCOMPLETE);
  }
  return responseForRpcError(req, {message: msg});
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
        return appErrorResponse(req, 400, API_ERROR_CODES.REGISTRATION_AFTER_START);
      }

      const {data: leaveResult, error} = await supabase.rpc('leave_event_participant', {
        p_event_id: event_id,
        p_discord_id: discordUser.id,
      });

      if (error) return participationError(req, error, 'Could not leave event');

      const removed = Boolean(
        leaveResult && typeof leaveResult === 'object' && (leaveResult as {removed?: boolean}).removed,
      );
      const promotedId =
        leaveResult && typeof leaveResult === 'object'
          ? ((leaveResult as {promoted_discord_id?: string | null}).promoted_discord_id ?? null)
          : null;

      let embedSynced = true;
      if (removed) {
        if (promotedId) {
          const {data: eventRow} = await supabase
            .from('events')
            .select('id, title, host_discord_id, max_players, group_count, starts_at, timezone_hint')
            .eq('id', event_id)
            .single();
          const {data: participants} = await supabase
            .from('event_participants')
            .select('discord_id, group_index, waitlisted, is_convoy_leader, gamertag_snapshot')
            .eq('event_id', event_id);
          if (eventRow && participants) {
            const groupIndex = participants.find((p) => p.discord_id === promotedId)?.group_index ?? 1;
            await enqueueWaitlistSeatOpened(
              supabase,
              eventRow,
              promotedId,
              groupIndex,
              participants,
            );
            if (
              shouldEnqueueHostGroupFilledOnPromote(
                participants,
                groupIndex,
                eventRow.max_players,
                eventRow.group_count ?? 1,
              )
            ) {
              await enqueueHostGroupFilled(supabase, eventRow, groupIndex);
            }
            deferNotificationDelivery(supabase);
          }
        }
        const embedSync = await syncPublishedEmbedByEventId(supabase, event_id);
        embedSynced = embedSync.ok;
        if (!embedSync.ok) {
          console.error(
            JSON.stringify({
              msg: 'Left event but Discord embed sync failed',
              eventId: event_id,
              status: embedSync.status,
            }),
          );
        }
      }
      return jsonResponse({joined: false, embed_synced: embedSynced}, 200, req);
    }

    if (action === 'join') {
      const tag = validateGamertag(gamertag);
      if (!tag.ok) return jsonResponse({error: tag.error}, 400, req);

      const {data: event} = await supabase
        .from('events')
        .select('max_players, group_count, current_players, status, starts_at, host_discord_id, title, timezone_hint')
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

      await ensureDiscordUserRow(supabase, discordUser);

      const {error: profileErr} = await supabase
        .from('users')
        .update({xbox_gamertag: tag.gamertag})
        .eq('discord_id', discordUser.id);
      if (profileErr) return databaseErrorResponse(req, 'event-participation profile', profileErr);

      const {data: roster} = await supabase
        .from('event_participants')
        .select('discord_id, group_index, waitlisted, is_convoy_leader, participation_source')
        .eq('event_id', event_id);
      const existing = roster?.find((r) => r.discord_id === discordUser.id);

      // Route into the first open group; waitlist when every group is full.
      let groupIndex = existing?.group_index ?? 1;
      let waitlisted: boolean;
      if (existing && !existing.waitlisted) {
        waitlisted = false;
      } else {
        const open = firstOpenGroup(roster ?? [], event.group_count ?? 1, event.max_players);
        if (open != null) {
          waitlisted = false;
          groupIndex = open;
        } else {
          waitlisted = true;
        }
      }


      // Preserve host-managed sources; a voluntary join from a non-leader row becomes self_join.
      const participationSource: string =
        existing?.participation_source === 'host_assigned' ||
        existing?.participation_source === 'host_self_assigned'
          ? existing.participation_source
          : 'self_join';

      const upsertRow = (wl: boolean) =>
        supabase.from('event_participants').upsert(
          {
            event_id,
            discord_id: discordUser.id,
            gamertag_snapshot: tag.gamertag,
            waitlisted: wl,
            group_index: groupIndex,
            is_convoy_leader: existing?.is_convoy_leader ?? false,
            participation_source: participationSource,
          },
          {onConflict: 'event_id,discord_id'},
        );

      let {error} = await upsertRow(waitlisted);
      // Lost the last seat to a concurrent joiner — fall back to the waitlist.
      if (error && !waitlisted && (error.message ?? '').includes('EVENT_FULL')) {
        waitlisted = true;
        ({error} = await upsertRow(true));
      }

      if (error) return participationError(req, error, 'Could not join event');

      const eventRow = {
        id: event_id,
        title: event.title,
        host_discord_id: event.host_discord_id,
        max_players: event.max_players,
        group_count: event.group_count,
        starts_at: event.starts_at,
        timezone: event.timezone_hint,
      };

      if (
        !waitlisted &&
        shouldEnqueueHostGroupFilledOnJoin(
          existing,
          waitlisted,
          roster ?? [],
          groupIndex,
          discordUser.id,
          event.max_players,
          event.group_count ?? 1,
        )
      ) {
        await enqueueHostGroupFilled(supabase, eventRow, groupIndex);
        deferNotificationDelivery(supabase);
      }

      const embedSync = await syncPublishedEmbedByEventId(supabase, event_id);
      if (!embedSync.ok) {
        console.error(
          JSON.stringify({
            msg: 'Joined event but Discord embed sync failed',
            eventId: event_id,
            status: embedSync.status,
          }),
        );
      }
      return jsonResponse(
        {joined: !waitlisted, waitlisted, group_index: groupIndex, embed_synced: embedSync.ok},
        200,
        req,
      );
    }

    return jsonResponse({error: 'Unknown action'}, 400, req);
  } catch (e) {
    return internalErrorResponse(req, e);
  }
});
