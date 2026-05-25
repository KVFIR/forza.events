import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {botHeaders, verifyDiscordToken} from '../_shared/discord.ts';
import {buildEventEmbed} from '../_shared/events.ts';
import {
  normalizeTrackCodes,
  validatePublishReady,
  type SaveEventBody,
} from '../_shared/eventSpec.ts';
import {adminClient} from '../_shared/supabase.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') return jsonResponse({error: 'Method not allowed'}, 405);

  const token =
    req.headers.get('x-discord-access-token') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const user = await verifyDiscordToken(token);
  if (!user) return jsonResponse({error: 'Unauthorized'}, 401);

  try {
    const {event_id, guild_id, channel_id, guild_name} = await req.json();
    if (!event_id || !guild_id || !channel_id) {
      return jsonResponse({error: 'Missing event_id, guild_id, or channel_id'}, 400);
    }

    const supabase = adminClient();
    const {data: event, error} = await supabase
      .from('events')
      .select('*, event_cars(car_id)')
      .eq('id', event_id)
      .single();

    if (error || !event) return jsonResponse({error: 'Event not found'}, 404);
    if (event.host_discord_id !== user.id) {
      return jsonResponse({error: 'Only the host can publish'}, 403);
    }
    if (event.status !== 'draft') {
      return jsonResponse({error: 'Only draft events can be published'}, 400);
    }
    if (event.guild_id && event.guild_id !== guild_id) {
      return jsonResponse({error: 'Server is locked for this draft'}, 400);
    }

    await supabase.from('discord_guilds').upsert(
      {guild_id, guild_name: guild_name ?? 'Server'},
      {onConflict: 'guild_id'},
    );

    const {data: eventCars} = await supabase
      .from('event_cars')
      .select('car_id, max_pi, tune_share_code, car_restrictions, cars(id, make, model, year, pi, class)')
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
      car_rule_mode: event.car_rule_mode,
      car_class_cap: event.car_class_cap,
      max_pi: event.max_pi,
      primary_track_code: event.event_share_code,
      extra_track_codes: event.track_codes ?? [],
      cars: (eventCars ?? []).map((ec) => {
        const raw = ec.cars;
        const car = (Array.isArray(raw) ? raw[0] : raw) as {
          id: string;
          make: string;
          model: string;
          year: number | null;
          pi: number;
          class: string;
        };
        return {
          id: car.id,
          make: car.make,
          model: car.model,
          year: car.year,
          pi: car.pi,
          class: car.class,
          max_pi: ec.max_pi,
          tune_share_code: ec.tune_share_code,
          car_restrictions: ec.car_restrictions ?? [],
        };
      }),
    };

    const publishErr = validatePublishReady(body, Boolean(event.cover_image_url?.trim()));
    if (publishErr) return jsonResponse({error: publishErr}, 400);

    const {primary} = normalizeTrackCodes(event.event_share_code, event.track_codes ?? []);
    if (!primary) return jsonResponse({error: 'Primary track code is required'}, 400);

    const payload = buildEventEmbed(event);
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
      console.error('Discord post failed', text);
      return jsonResponse({error: 'Failed to post message'}, 502);
    }

    const message = await msgRes.json();

    const {error: updateErr} = await supabase
      .from('events')
      .update({
        guild_id,
        channel_id,
        discord_message_id: message.id,
        status: 'open',
        event_share_code: primary,
      })
      .eq('id', event_id);

    if (updateErr) {
      return jsonResponse({error: 'Posted but failed to update event'}, 500);
    }

    return jsonResponse({message_id: message.id, channel_id, guild_id});
  } catch (e) {
    console.error(e);
    return jsonResponse({error: String(e)}, 500);
  }
});
