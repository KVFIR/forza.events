import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {databaseErrorResponse, internalErrorResponse} from '../_shared/apiResponse.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {verifyDiscordToken} from '../_shared/discord.ts';
import {rateLimitAuth} from '../_shared/rateLimitPresets.ts';
import {adminClient} from '../_shared/supabase.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST') return jsonResponse({error: 'Method not allowed'}, 405, req);

  const token =
    req.headers.get('x-discord-access-token') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const discordUser = await verifyDiscordToken(token);
  if (!discordUser) return jsonResponse({error: 'Unauthorized'}, 401, req);

  const authLimited = await rateLimitAuth(req, discordUser.id);
  if (authLimited) return authLimited;

  try {
    const body = await req.json().catch(() => ({}));
    const guildId =
      typeof body.guild_id === 'string' && body.guild_id.trim()
        ? body.guild_id.trim()
        : null;

    const supabase = adminClient();
    const cutoff = new Date(Date.now() - 60_000).toISOString();

    let query = supabase
      .from('launch_intents')
      .select('id, event_id')
      .eq('discord_id', discordUser.id)
      .gte('created_at', cutoff)
      .order('created_at', {ascending: false})
      .limit(1);

    if (guildId) {
      query = query.eq('guild_id', guildId);
    } else {
      query = query.is('guild_id', null);
    }

    const {data: rows, error} = await query;

    if (error) {
      console.error(JSON.stringify({msg: 'launch-intent lookup failed', detail: error.message}));
      return databaseErrorResponse(req, 'launch-intent lookup', error);
    }

    if (!rows?.length) {
      return jsonResponse({event_id: null}, 200, req);
    }

    const intent = rows[0];
    await supabase.from('launch_intents').delete().eq('id', intent.id);

    return jsonResponse({event_id: intent.event_id}, 200, req);
  } catch (e) {
    return internalErrorResponse(req, e);
  }
});
