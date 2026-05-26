import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {verifyDiscordToken} from '../_shared/discord.ts';
import {userIsGuildMember, userCanManageGuildById} from '../_shared/guildAccess.ts';
import {validatePublishChannelTarget} from '../_shared/publishTarget.ts';
import {rateLimitAuth} from '../_shared/rateLimitPresets.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST') return jsonResponse({error: 'Method not allowed'}, 405, req);

  const token =
    req.headers.get('x-discord-access-token') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const user = await verifyDiscordToken(token);
  if (!user) return jsonResponse({error: 'Unauthorized'}, 401, req);

  const authLimited = await rateLimitAuth(req, user.id);
  if (authLimited) return authLimited;

  try {
    const {guild_id, channel_id} = await req.json();
    if (!guild_id || !channel_id) {
      return jsonResponse({error: 'Missing guild_id or channel_id'}, 400, req);
    }

    if (!(await userIsGuildMember(token!, guild_id))) {
      return jsonResponse({error: 'Forbidden'}, 403, req);
    }
    if (!(await userCanManageGuildById(token!, guild_id))) {
      return jsonResponse(
        {ok: false, error: 'You need Manage Server permission to publish events here.'},
        403,
        req,
      );
    }

    const result = await validatePublishChannelTarget(guild_id, channel_id);
    if (!result.ok) {
      return jsonResponse({ok: false, error: result.error}, 400, req);
    }

    return jsonResponse({ok: true}, 200, req);
  } catch (e) {
    console.error(e);
    return jsonResponse({error: String(e)}, 500, req);
  }
});
