import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {API_ERROR_CODES} from '../_shared/apiErrorCodes.ts';
import {appErrorResponse, internalErrorResponse} from '../_shared/apiResponse.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {requireDiscordUser} from '../_shared/discordRequestAuth.ts';
import {isDeniedManageGuildError, requireManageGuildAccess} from '../_shared/guildAccess.ts';
import {validatePublishChannelTarget} from '../_shared/publishTarget.ts';
import {rateLimitAuth} from '../_shared/rateLimitPresets.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST') return jsonResponse({error: 'Method not allowed'}, 405, req);

  const auth = await requireDiscordUser(req);
  if (auth instanceof Response) return auth;
  const {user, token} = auth;

  const authLimited = await rateLimitAuth(req, user.id);
  if (authLimited) return authLimited;

  try {
    const {guild_id, channel_id} = await req.json();
    if (!guild_id || !channel_id) {
      return jsonResponse({error: 'Missing guild_id or channel_id'}, 400, req);
    }

    try {
      await requireManageGuildAccess(token!, guild_id, user.id);
    } catch (e) {
      if (!isDeniedManageGuildError(e)) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === 'Forbidden') return jsonResponse({error: 'Forbidden'}, 403, req);
      return jsonResponse({ok: false, error: msg}, 403, req);
    }

    const result = await validatePublishChannelTarget(guild_id, channel_id);
    if (!result.ok) {
      return jsonResponse({ok: false, error: result.error, code: result.code}, 400, req);
    }

    return jsonResponse({ok: true}, 200, req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('rate limit')) {
      return appErrorResponse(req, 429, API_ERROR_CODES.TOO_MANY_REQUESTS);
    }
    return internalErrorResponse(req, e);
  }
});
