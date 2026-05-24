import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {botHeaders, verifyDiscordToken} from '../_shared/discord.ts';
import {buildEventEmbed} from '../_shared/events.ts';
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
    const {event_id, channel_id} = await req.json();
    if (!event_id || !channel_id) {
      return jsonResponse({error: 'Missing event_id or channel_id'}, 400);
    }

    const supabase = adminClient();
    const {data: event, error} = await supabase
      .from('events')
      .select('*')
      .eq('id', event_id)
      .single();

    if (error || !event) return jsonResponse({error: 'Event not found'}, 404);
    if (event.host_discord_id !== user.id) {
      return jsonResponse({error: 'Only the host can publish'}, 403);
    }

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
        channel_id,
        discord_message_id: message.id,
        status: 'open',
      })
      .eq('id', event_id);

    if (updateErr) {
      return jsonResponse({error: 'Posted but failed to update event'}, 500);
    }

    return jsonResponse({message_id: message.id, channel_id});
  } catch (e) {
    console.error(e);
    return jsonResponse({error: String(e)}, 500);
  }
});
