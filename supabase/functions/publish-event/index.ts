import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {API_ERROR_CODES} from '../_shared/apiErrorCodes.ts';
import {appErrorResponse, databaseErrorResponse, internalErrorResponse} from '../_shared/apiResponse.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {deleteChannelMessage, mapDiscordPostError, postChannelMessage, resolveChannelInviteUrl} from '../_shared/discord.ts';
import {requireDiscordUser} from '../_shared/discordRequestAuth.ts';
import {isDeniedManageGuildError, requireManageGuildAccess} from '../_shared/guildAccess.ts';
import {validatePublishChannelTarget} from '../_shared/publishTarget.ts';
import {buildEventEmbed, mapEventCarsForEmbed} from '../_shared/events.ts';
import {validatePublishReady, validateRankedAgainstEvent} from '../_shared/eventSpec.ts';
import {isGuildRatingEnabled} from '../_shared/applyEventRatings.ts';
import {VALIDATION_CODES} from '../_shared/validationCodes.ts';
import {buildGuildCatalogUpsert} from '../_shared/guildCatalog.ts';
import {normalizeGuildName} from '../_shared/guildDisplay.ts';
import {ensureConvoyLeaderParticipantForEvent} from '../_shared/participantLeader.ts';
import {buildPublishEventBody} from '../_shared/publishEventBody.ts';
import {
  claimPublishLock,
  clearPublishLock,
  finalizePublish,
  isAlreadyPublished,
  loadPublishedSnapshot,
  publishClaimFailureCode,
  publishedEventResponsePayload,
} from '../_shared/publishLock.ts';
import {rateLimitMutation} from '../_shared/rateLimitPresets.ts';
import {adminClient} from '../_shared/supabase.ts';
import {enqueueEventPublished} from '../_shared/notificationTriggers.ts';

declare const EdgeRuntime: {waitUntil: (promise: Promise<unknown>) => void} | undefined;

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST') return jsonResponse({error: 'Method not allowed'}, 405, req);

  const auth = await requireDiscordUser(req);
  if (auth instanceof Response) return auth;
  const {user, token} = auth;

  const mutationLimited = await rateLimitMutation(req, user.id);
  if (mutationLimited) return mutationLimited;

  let lockedEventId: string | null = null;
  let postedChannelId: string | null = null;
  let postedMessageId: string | null = null;

  try {
    const {event_id, guild_id, channel_id} = await req.json();
    if (!event_id || !guild_id || !channel_id) {
      return jsonResponse({error: 'Missing event_id, guild_id, or channel_id'}, 400, req);
    }

    let publishGuild;
    try {
      publishGuild = await requireManageGuildAccess(token!, guild_id, user.id);
    } catch (e) {
      if (!isDeniedManageGuildError(e)) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === 'Forbidden') return jsonResponse({error: 'Forbidden'}, 403, req);
      return jsonResponse({error: msg}, 403, req);
    }

    const channelCheck = await validatePublishChannelTarget(guild_id, channel_id);
    if (!channelCheck.ok) {
      return jsonResponse({error: channelCheck.error, code: channelCheck.code}, 400, req);
    }

    const supabase = adminClient();
    const {data: event, error} = await supabase
      .from('events')
      .select('*, event_cars(car_id)')
      .eq('id', event_id)
      .single();

    if (error || !event) return jsonResponse({error: 'Event not found'}, 404, req);
    if (event.host_discord_id !== user.id) {
      return jsonResponse({error: 'Only the host can publish'}, 403, req);
    }
    if (event.guild_id && event.guild_id !== guild_id) {
      return jsonResponse({error: 'Server is locked for this draft'}, 400, req);
    }

    const snapshot = await loadPublishedSnapshot(supabase, event_id);
    if (snapshot && isAlreadyPublished(snapshot)) {
      return jsonResponse(publishedEventResponsePayload(snapshot), 200, req);
    }

    const {data: eventCars} = await supabase
      .from('event_cars')
      .select('car_id, max_pi, tune_share_code, car_restrictions, cars(id, make, model, year, pi, abbreviation)')
      .eq('event_id', event_id);

    const publishBody = buildPublishEventBody(event, eventCars ?? [], guild_id, channel_id);
    const publishErr = validatePublishReady(publishBody);
    if (publishErr) return appErrorResponse(req, 400, publishErr);

    if (publishBody.is_ranked) {
      const allowed = await isGuildRatingEnabled(supabase, guild_id);
      const rankedErr = validateRankedAgainstEvent(true, allowed);
      if (rankedErr) return appErrorResponse(req, 400, rankedErr);
    }

    const resolvedGuildName = normalizeGuildName(publishGuild.name);
    if (!resolvedGuildName) {
      return appErrorResponse(req, 400, VALIDATION_CODES.GUILD_REQUIRED);
    }

    const claimed = await claimPublishLock(supabase, event_id, user.id, {
      guildId: guild_id,
      channelId: channel_id,
    });

    if (!claimed) {
      const afterClaim = await loadPublishedSnapshot(supabase, event_id);
      if (afterClaim && isAlreadyPublished(afterClaim)) {
        return jsonResponse(publishedEventResponsePayload(afterClaim), 200, req);
      }
      if (afterClaim) {
        const code = publishClaimFailureCode(afterClaim);
        const status = code === API_ERROR_CODES.PUBLISH_IN_PROGRESS ? 409 : 400;
        return appErrorResponse(req, status, code);
      }
      return appErrorResponse(req, 404, API_ERROR_CODES.EVENT_NOT_FOUND);
    }

    lockedEventId = event_id;
    postedChannelId = channel_id;

    let leaderProfile: {username?: string | null; avatar_url?: string | null} | undefined;
    if (event.lobby_leader_discord_id && event.lobby_leader_is_host === false) {
      const {data: leaderUser} = await supabase
        .from('users')
        .select('username, avatar_url')
        .eq('discord_id', event.lobby_leader_discord_id)
        .maybeSingle();
      if (leaderUser) {
        leaderProfile = {
          username: leaderUser.username,
          avatar_url: leaderUser.avatar_url,
        };
      }
    }

    await ensureConvoyLeaderParticipantForEvent(
      supabase,
      {
        id: event_id,
        host_discord_id: event.host_discord_id,
        lobby_leader_discord_id: event.lobby_leader_discord_id,
        lobby_leader_is_host: event.lobby_leader_is_host,
        lobby_leader_gamertag: event.lobby_leader_gamertag,
      },
      leaderProfile,
    );

    const {data: eventForEmbed, error: refreshErr} = await supabase
      .from('events')
      .select('current_players')
      .eq('id', event_id)
      .single();
    if (refreshErr || !eventForEmbed) {
      await clearPublishLock(supabase, event_id);
      lockedEventId = null;
      return databaseErrorResponse(
        req,
        'publish-event roster refresh',
        refreshErr ?? {message: 'missing event row'},
      );
    }

    const payload = buildEventEmbed({
      ...event,
      current_players: eventForEmbed.current_players,
      guild_name: resolvedGuildName,
      allowed_cars: mapEventCarsForEmbed(eventCars ?? []),
    });

    const msgRes = await postChannelMessage(channel_id, payload);
    if (!msgRes.ok) {
      await clearPublishLock(supabase, event_id);
      lockedEventId = null;
      return jsonResponse(
        {error: mapDiscordPostError(msgRes.status, msgRes.body)},
        502,
        req,
      );
    }

    postedMessageId = msgRes.id;

    const finalized = await finalizePublish(supabase, event_id, {
      messageId: msgRes.id,
      guildId: guild_id,
      channelId: channel_id,
    });

    if (!finalized) {
      console.error(
        JSON.stringify({
          msg: 'publish orphan Discord message',
          eventId: event_id,
          channelId: channel_id,
          messageId: msgRes.id,
        }),
      );
      await deleteChannelMessage(channel_id, msgRes.id);
      await clearPublishLock(supabase, event_id);
      lockedEventId = null;
      postedMessageId = null;
      return appErrorResponse(req, 500, API_ERROR_CODES.INTERNAL);
    }

    // Finalize already wrote discord_message_id and cleared the lock.
    postedMessageId = null;
    lockedEventId = null;

    const followup = async () => {
      await enqueueEventPublished(supabase, {
        id: event_id,
        title: event.title,
        host_discord_id: event.host_discord_id,
        starts_at: event.starts_at,
        timezone: event.timezone_hint,
        type: event.type,
        game: event.game,
      });
      try {
        const {data: existingGuild} = await supabase
          .from('discord_guilds')
          .select('settings')
          .eq('guild_id', guild_id)
          .maybeSingle();

        const inviteUrl = await resolveChannelInviteUrl(channel_id);
        await supabase.from('discord_guilds').upsert(
          buildGuildCatalogUpsert(guild_id, resolvedGuildName, publishGuild, {
            inviteUrl,
            existingSettings: existingGuild?.settings,
          }),
          {onConflict: 'guild_id'},
        );
      } catch (e) {
        console.error(JSON.stringify({
          msg: 'publish guild catalog failed',
          eventId: event_id,
          detail: e instanceof Error ? e.message : String(e),
        }));
      }
    };
    const runFollowup = () => followup().catch((e) => {
      console.error(JSON.stringify({
        msg: 'publish post-finalize failed',
        eventId: event_id,
        detail: e instanceof Error ? e.message : String(e),
      }));
    });
    if (typeof EdgeRuntime !== 'undefined' && typeof EdgeRuntime.waitUntil === 'function') {
      EdgeRuntime.waitUntil(runFollowup());
    } else {
      void runFollowup();
    }

    return jsonResponse({message_id: msgRes.id, channel_id, guild_id}, 200, req);
  } catch (e) {
    if (lockedEventId) {
      const supabase = adminClient();
      if (postedChannelId && postedMessageId) {
        await deleteChannelMessage(postedChannelId, postedMessageId);
      }
      await clearPublishLock(supabase, lockedEventId);
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('rate limit')) {
      return appErrorResponse(req, 429, API_ERROR_CODES.TOO_MANY_REQUESTS);
    }
    return internalErrorResponse(req, e);
  }
});
