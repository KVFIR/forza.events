import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {verifyDiscordToken} from '../_shared/discord.ts';
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
    const {guild_id} = await req.json();
    if (!guild_id) return jsonResponse({error: 'Missing guild_id'}, 400);

    const supabase = adminClient();
    const cutoff = new Date(Date.now() - 60_000).toISOString();

    const {data: rows} = await supabase
      .from('launch_intents')
      .select('id, event_id')
      .eq('discord_id', discordUser.id)
      .eq('guild_id', guild_id)
      .gte('created_at', cutoff)
      .order('created_at', {ascending: false})
      .limit(1);

    if (!rows?.length) {
      return jsonResponse({event_id: null});
    }

    const intent = rows[0];
    await supabase.from('launch_intents').delete().eq('id', intent.id);

    return jsonResponse({event_id: intent.event_id});
  } catch (e) {
    console.error(e);
    return jsonResponse({error: String(e)}, 500);
  }
});
