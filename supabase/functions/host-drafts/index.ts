import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {EVENT_LIST_SELECT} from '../_shared/eventListSelect.ts';
import {internalErrorResponse} from '../_shared/apiResponse.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {verifyDiscordToken} from '../_shared/discord.ts';
import {rateLimitAuth} from '../_shared/rateLimitPresets.ts';
import {adminClient} from '../_shared/supabase.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST') {
    return jsonResponse({error: 'Method not allowed'}, 405, req);
  }

  try {
    const token =
      req.headers.get('x-discord-access-token') ??
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const discordUser = await verifyDiscordToken(token);
    if (!discordUser) return jsonResponse({error: 'Unauthorized'}, 401, req);

    const authLimited = await rateLimitAuth(req, discordUser.id);
    if (authLimited) return authLimited;

    const supabase = adminClient();
    const {data, error} = await supabase
      .from('events')
      .select(EVENT_LIST_SELECT)
      .eq('host_discord_id', discordUser.id)
      .is('discord_message_id', null)
      .not('status', 'in', '("completed","cancelled","archived")')
      .order('updated_at', {ascending: false});

    if (error) {
      console.error('host-drafts', error);
      return jsonResponse({error: error.message}, 500, req);
    }

    return jsonResponse({data: data ?? []}, 200, req);
  } catch (e) {
    return internalErrorResponse(req, e);
  }
});
