import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {EVENT_LIST_SELECT} from '../_shared/eventListSelect.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {verifyDiscordToken} from '../_shared/discord.ts';
import {adminClient} from '../_shared/supabase.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') {
    return jsonResponse({error: 'Method not allowed'}, 405);
  }

  try {
    const token =
      req.headers.get('x-discord-access-token') ??
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const discordUser = await verifyDiscordToken(token);
    if (!discordUser) return jsonResponse({error: 'Unauthorized'}, 401);

    const supabase = adminClient();
    const {data, error} = await supabase
      .from('events')
      .select(EVENT_LIST_SELECT)
      .eq('status', 'draft')
      .eq('host_discord_id', discordUser.id)
      .order('updated_at', {ascending: false});

    if (error) {
      console.error('host-drafts', error);
      return jsonResponse({error: error.message}, 500);
    }

    return jsonResponse({data: data ?? []});
  } catch (e) {
    console.error(e);
    return jsonResponse({error: String(e)}, 500);
  }
});
