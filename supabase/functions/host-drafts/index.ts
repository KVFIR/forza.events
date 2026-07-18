import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {EVENT_LIST_SELECT} from '../_shared/eventListSelect.ts';
import {databaseErrorResponse, internalErrorResponse} from '../_shared/apiResponse.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {requireDiscordUser} from '../_shared/discordRequestAuth.ts';
import {rateLimitAuth} from '../_shared/rateLimitPresets.ts';
import {hostDraftStatusFilter} from '../_shared/draftEvents.ts';
import {adminClient} from '../_shared/supabase.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST') {
    return jsonResponse({error: 'Method not allowed'}, 405, req);
  }

  try {
    const auth = await requireDiscordUser(req);
    if (auth instanceof Response) return auth;
    const {user: discordUser} = auth;

    const authLimited = await rateLimitAuth(req, discordUser.id);
    if (authLimited) return authLimited;

    const supabase = adminClient();
    const {data, error} = await supabase
      .from('events')
      .select(EVENT_LIST_SELECT)
      .eq('host_discord_id', discordUser.id)
      .in('status', hostDraftStatusFilter())
      .order('updated_at', {ascending: false});

    if (error) {
      console.error('host-drafts', error);
      return databaseErrorResponse(req, 'host-drafts', error);
    }

    return jsonResponse({data: data ?? []}, 200, req);
  } catch (e) {
    return internalErrorResponse(req, e);
  }
});
