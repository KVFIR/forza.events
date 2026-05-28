import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {API_ERROR_CODES} from '../_shared/apiErrorCodes.ts';
import {appErrorResponse, internalErrorResponse} from '../_shared/apiResponse.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {botHeaders, mapDiscordPostError, verifyDiscordToken} from '../_shared/discord.ts';
import {requireManageGuildAccess, resolveGuildNameForUser} from '../_shared/guildAccess.ts';
import {validatePublishChannelTarget} from '../_shared/publishTarget.ts';
import {buildEventEmbed, mapEventCarsForEmbed} from '../_shared/events.ts';
import {validatePublishReady, type SaveEventBody} from '../_shared/eventSpec.ts';
import {normalizeGuildName} from '../_shared/guildDisplay.ts';
import {ensureConvoyLeaderParticipantForEvent} from '../_shared/participantLeader.ts';
import {rateLimitMutation} from '../_shared/rateLimitPresets.ts';
import {adminClient} from '../_shared/supabase.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST') return jsonResponse({error: 'Method not allowed'}, 405, req);

  const token =
    req.headers.get('x-discord-access-token') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const user = await verifyDiscordToken(token);
  if (!user) return jsonResponse({error: 'Unauthorized'}, 401, req);

  const mutationLimited = await rateLimitMutation(req, user.id);
  if (mutationLimited) return mutationLimited;

  try {
    const {event_id, guild_id, channel_id} = await req.json();
    if (!event_id || !guild_id || !channel_id) {
      return jsonResponse({error: 'Missing event_id, guild_id, or channel_id'}, 400, req);
    }

    try {
      await requireManageGuildAccess(token!, guild_id);
    } catch (e) {
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
    if (event.status !== 'draft') {
      if (
        event.discord_message_id &&
        event.status === 'open' &&
        event.channel_id &&
        event.guild_id
      ) {
        return jsonResponse(
          {
            message_id: event.discord_message_id,
            channel_id: event.channel_id,
            guild_id: event.guild_id,
            already_published: true,
          },
          200,
          req,
        );
      }
      return appErrorResponse(req, 400, API_ERROR_CODES.NOT_DRAFT);
    }
    if (event.guild_id && event.guild_id !== guild_id) {
      return jsonResponse({error: 'Server is locked for this draft'}, 400, req);
    }

    const resolvedGuildName = normalizeGuildName(
      await resolveGuildNameForUser(token!, guild_id),
    );
    if (!resolvedGuildName) {
      return jsonResponse({error: 'Choose a Discord server from the list before publishing.'}, 400, req);
    }
    await supabase.from('discord_guilds').upsert(
      {guild_id, guild_name: resolvedGuildName},
      {onConflict: 'guild_id'},
    );

    const {data: eventCars} = await supabase
      .from('event_cars')
      .select('car_id, max_pi, tune_share_code, car_restrictions, cars(id, make, model, year, pi)')
      .eq('event_id', event_id);

    const body: SaveEventBody = {
      title: event.title,
      type: event.type,
      starts_at: event.starts_at,
      timezone_hint: event.timezone_hint,
      description: event.description,
      cover_image_url: event.cover_image_url,
      lobby_leader_gamertag: event.lobby_leader_gamertag,
      lobby_leader_is_host: event.lobby_leader_is_host,
      guild_id,
      channel_id,
      car_rule_mode: event.car_rule_mode,
      max_pi: event.max_pi,
      tracks: event.tracks ?? [],
      additional_car_restrictions:
        event.additional_car_restrictions ??
        (Array.isArray(event.rules_allowed)
          ? event.rules_allowed.find((rule: string) => rule.startsWith('additional:'))?.slice('additional:'.length) ?? null
          : null),
      cars: (eventCars ?? []).map((ec) => {
        const raw = ec.cars;
        const car = (Array.isArray(raw) ? raw[0] : raw) as {
          id: string;
          make: string;
          model: string;
          year: number | null;
          pi: number;
        };
        return {
          id: car.id,
          make: car.make,
          model: car.model,
          year: car.year,
          pi: car.pi,
          max_pi: ec.max_pi,
          tune_share_code: ec.tune_share_code,
          car_restrictions: ec.car_restrictions ?? [],
        };
      }),
    };

    const publishErr = validatePublishReady(body);
    if (publishErr) return appErrorResponse(req, 400, publishErr);

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
      return jsonResponse({error: 'Failed to refresh event after roster sync'}, 500, req);
    }

    const payload = buildEventEmbed({
      ...event,
      current_players: eventForEmbed.current_players,
      guild_name: resolvedGuildName,
      allowed_cars: mapEventCarsForEmbed(eventCars ?? []),
    });
    const msgRes = await fetch(
      `https://discord.com/api/channels/${channel_id}/messages`,
      {
        method: 'POST',
        headers: botHeaders(),
        body: JSON.stringify(payload),
      },
    );

    if (!msgRes.ok) {
      const text = await msgRes.text();
      return jsonResponse({error: mapDiscordPostError(msgRes.status, text)}, 502, req);
    }

    const message = await msgRes.json();

    const {error: updateErr} = await supabase
      .from('events')
      .update({
        guild_id,
        channel_id,
        discord_message_id: message.id,
        status: 'open',
      })
      .eq('id', event_id);

    if (updateErr) {
      return jsonResponse({error: 'Posted but failed to update event'}, 500, req);
    }

    return jsonResponse({message_id: message.id, channel_id, guild_id}, 200, req);
  } catch (e) {
    return internalErrorResponse(req, e);
  }
});
