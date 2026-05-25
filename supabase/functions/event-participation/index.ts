import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {verifyDiscordToken} from '../_shared/discord.ts';
import {eventHasStarted} from '../_shared/eventSpec.ts';
import {adminClient} from '../_shared/supabase.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') return jsonResponse({error: 'Method not allowed'}, 405);

  const token =
    req.headers.get('x-discord-access-token') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const discordUser = await verifyDiscordToken(token);
  if (!discordUser) return jsonResponse({error: 'Unauthorized'}, 401);

  try {
    const {event_id, action, gamertag} = await req.json();
    if (!event_id || !action) {
      return jsonResponse({error: 'Missing event_id or action'}, 400);
    }

    const supabase = adminClient();

    if (action === 'leave') {
      const {error} = await supabase
        .from('event_participants')
        .delete()
        .eq('event_id', event_id)
        .eq('discord_id', discordUser.id);
      if (error) return jsonResponse({error: error.message}, 500);
      return jsonResponse({joined: false});
    }

    if (action === 'join') {
      if (!gamertag || typeof gamertag !== 'string') {
        return jsonResponse({error: 'Gamertag required'}, 400);
      }

      const {data: event} = await supabase
        .from('events')
        .select('max_players, current_players, status, starts_at')
        .eq('id', event_id)
        .single();

      if (!event || event.status === 'draft') {
        return jsonResponse({error: 'Event not found'}, 404);
      }
      if (['completed', 'cancelled', 'archived'].includes(event.status)) {
        return jsonResponse({error: 'Registration is closed'}, 400);
      }
      if (eventHasStarted(event)) {
        return jsonResponse({error: 'Registration closed after event start'}, 400);
      }
      if (event.current_players >= event.max_players) {
        return jsonResponse({error: 'Event full'}, 409);
      }

      await supabase
        .from('users')
        .update({xbox_gamertag: gamertag.trim()})
        .eq('discord_id', discordUser.id);

      const {error} = await supabase.from('event_participants').upsert(
        {
          event_id,
          discord_id: discordUser.id,
          gamertag_snapshot: gamertag.trim(),
        },
        {onConflict: 'event_id,discord_id'},
      );

      if (error) return jsonResponse({error: error.message}, 500);
      return jsonResponse({joined: true});
    }

    return jsonResponse({error: 'Unknown action'}, 400);
  } catch (e) {
    console.error(e);
    return jsonResponse({error: String(e)}, 500);
  }
});
