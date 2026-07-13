import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {API_ERROR_CODES} from '../_shared/apiErrorCodes.ts';
import {appErrorResponse, databaseErrorResponse, internalErrorResponse} from '../_shared/apiResponse.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {fetchDiscordUserById, isUserMemberOfGuild, verifyDiscordToken} from '../_shared/discord.ts';
import {ensureUserRowForDiscordId, resolveDiscordHandleForUserId} from '../_shared/discordUserRow.ts';
import {syncPublishedEmbedByEventId} from '../_shared/embedSync.ts';
import {eventHasStarted} from '../_shared/eventSpec.ts';
import {canPickAsNewGroupLeader, firstOpenGroup, resolveAddGroupParticipationSource} from '../_shared/eventGroups.ts';
import {responseForRpcError} from '../_shared/rpcErrors.ts';
import {validateGamertag} from '../_shared/gamertag.ts';
import {rateLimitMutation} from '../_shared/rateLimitPresets.ts';
import {deferNotificationDelivery} from '../_shared/notifications.ts';
import {enqueueWaitlistNewGroup, enqueueConvoyLeaderAssigned} from '../_shared/notificationTriggers.ts';
import {adminClient} from '../_shared/supabase.ts';
import {VALIDATION_CODES} from '../_shared/validationCodes.ts';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CLOSED_STATUSES = new Set(['completed', 'cancelled', 'archived']);

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
    const body = await req.json();
    const eventId = body.event_id;
    const leaderId = String(body.leader_discord_id ?? '').trim();
    if (!eventId || typeof eventId !== 'string' || !UUID_RE.test(eventId)) {
      return jsonResponse({error: 'Invalid event_id'}, 400, req);
    }
    if (!leaderId) {
      return appErrorResponse(req, 400, VALIDATION_CODES.CONVOY_LEADER_DISCORD_REQUIRED);
    }

    const supabase = adminClient();
    const {data: event} = await supabase
      .from('events')
      .select(
        'host_discord_id, guild_id, status, starts_at, group_count, max_players, lobby_leader_discord_id, lobby_leader_is_host, lobby_leader_gamertag, title, timezone_hint',
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
    if (eventHasStarted(event)) {
      return appErrorResponse(req, 400, API_ERROR_CODES.REGISTRATION_AFTER_START);
    }

    const {data: roster} = await supabase
      .from('event_participants')
      .select(
        'discord_id, group_index, waitlisted, is_convoy_leader, gamertag_snapshot, participation_source',
      )
      .eq('event_id', eventId);

    const open = firstOpenGroup(roster ?? [], event.group_count ?? 1, event.max_players);
    if (open != null) {
      return appErrorResponse(req, 400, API_ERROR_CODES.LOBBY_NOT_FULL);
    }

    if (
      !canPickAsNewGroupLeader(roster ?? [], leaderId, {
        hostDiscordId: event.host_discord_id,
        lobbyLeaderGamertag: event.lobby_leader_gamertag,
        lobbyLeaderDiscordId: event.lobby_leader_discord_id,
        lobbyLeaderIsHost: event.lobby_leader_is_host,
      })
    ) {
      return appErrorResponse(req, 400, API_ERROR_CODES.LEADER_ALREADY_CONVOY_LEADER);
    }

    const existingLeaderRow = (roster ?? []).find((r) => r.discord_id === leaderId);
    const waitlistedBefore = new Set(
      (roster ?? []).filter((r) => r.waitlisted).map((r) => r.discord_id),
    );
    const leaderFromWaitlist = Boolean(existingLeaderRow?.waitlisted);

    let leaderGamertag = String(body.leader_gamertag ?? '').trim();
    if (!leaderGamertag) leaderGamertag = existingLeaderRow?.gamertag_snapshot?.trim() ?? '';

    if (event.guild_id) {
      try {
        const inGuild = await isUserMemberOfGuild(event.guild_id, leaderId);
        if (!inGuild) {
          return appErrorResponse(req, 400, VALIDATION_CODES.CONVOY_LEADER_NOT_IN_GUILD);
        }
      } catch (e) {
        console.error(
          JSON.stringify({msg: 'add-group leader guild check failed', detail: String(e)}),
        );
        return appErrorResponse(req, 400, VALIDATION_CODES.CONVOY_LEADER_GUILD_CHECK_FAILED);
      }
    }

    if (!existingLeaderRow) {
      const {data: leaderProfile} = await supabase
        .from('users')
        .select('username, avatar_url, xbox_gamertag')
        .eq('discord_id', leaderId)
        .maybeSingle();
      if (!leaderGamertag) leaderGamertag = leaderProfile?.xbox_gamertag?.trim() ?? '';

      const handle = await resolveDiscordHandleForUserId(leaderId, {
        bodyHandle: body.leader_username,
        existingUsername: leaderProfile?.username,
        fetchById: fetchDiscordUserById,
      });
      if (!handle) return appErrorResponse(req, 400, VALIDATION_CODES.CONVOY_LEADER_HANDLE_REQUIRED);
      await ensureUserRowForDiscordId(supabase, leaderId, {
        username: handle,
        avatar_url: body.leader_avatar_url ?? leaderProfile?.avatar_url,
      });
    }

    const tag = validateGamertag(leaderGamertag);
    if (!tag.ok) return appErrorResponse(req, 400, VALIDATION_CODES.CONVOY_LEADER_REQUIRED);

    const participationSource = resolveAddGroupParticipationSource(
      leaderId,
      event.host_discord_id,
      existingLeaderRow?.participation_source,
    );

    const {data: newGroup, error: rpcErr} = await supabase.rpc('add_event_group', {
      p_event_id: eventId,
      p_leader_discord_id: leaderId,
      p_leader_gamertag: tag.gamertag,
      p_participation_source: participationSource,
    });
    if (rpcErr) return responseForRpcError(req, rpcErr);

    const newGroupIndex = Number(newGroup);
    const {data: rosterAfter} = await supabase
      .from('event_participants')
      .select('discord_id, group_index, waitlisted, is_convoy_leader, gamertag_snapshot')
      .eq('event_id', eventId);

    const promotedIds = (rosterAfter ?? [])
      .filter(
        (r) =>
          !r.waitlisted &&
          (r.group_index ?? 1) === newGroupIndex &&
          waitlistedBefore.has(r.discord_id),
      )
      .map((r) => r.discord_id);

    const eventRow = {
      id: eventId,
      title: event.title,
      host_discord_id: event.host_discord_id,
      max_players: event.max_players,
      group_count: newGroupIndex,
      starts_at: event.starts_at,
      timezone: event.timezone_hint,
    };

    let notify = false;
    if (promotedIds.length) {
      await enqueueWaitlistNewGroup(
        supabase,
        eventRow,
        newGroupIndex,
        promotedIds,
        leaderFromWaitlist,
        leaderId,
        rosterAfter ?? [],
      );
      notify = true;
    }

    const leaderAlreadyNotified = leaderFromWaitlist && promotedIds.includes(leaderId);
    if (!leaderAlreadyNotified) {
      await enqueueConvoyLeaderAssigned(
        supabase,
        eventRow,
        newGroupIndex,
        leaderId,
        tag.gamertag,
      );
      notify = true;
    }

    if (notify) deferNotificationDelivery(supabase);

    const embedSync = await syncPublishedEmbedByEventId(supabase, eventId);
    if (!embedSync.ok) {
      console.error(
        JSON.stringify({msg: 'Added group but Discord embed sync failed', eventId, status: embedSync.status}),
      );
    }

    return jsonResponse(
      {ok: true, group_count: newGroup, embed_synced: embedSync.ok},
      200,
      req,
    );
  } catch (e) {
    return internalErrorResponse(req, e);
  }
});
