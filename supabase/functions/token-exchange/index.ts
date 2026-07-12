import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {databaseErrorResponse, internalErrorResponse, appErrorResponse} from '../_shared/apiResponse.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {avatarUrl, discordUniqueUsername, exchangeCode, fetchDiscordUser} from '../_shared/discord.ts';
import {deferGuildCatalogUpsert} from '../_shared/deferredGuildCatalog.ts';
import {ensureDiscordUserRow} from '../_shared/discordUserRow.ts';
import {resolveOAuthRedirectUri} from '../_shared/oauthRedirect.ts';
import {API_ERROR_CODES} from '../_shared/apiErrorCodes.ts';
import {rateLimitOAuthExchange} from '../_shared/rateLimitPresets.ts';
import {adminClient} from '../_shared/supabase.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST') {
    return jsonResponse({error: 'Method not allowed'}, 405, req);
  }

  try {
    const {code, guild_id, redirect_uri} = await req.json();
    if (!code) {
      return jsonResponse({error: 'Missing code'}, 400, req);
    }

    const oauthLimited = await rateLimitOAuthExchange(req);
    if (oauthLimited) return oauthLimited;

    let safeRedirect: string;
    try {
      safeRedirect = resolveOAuthRedirectUri(redirect_uri);
    } catch {
      return jsonResponse({error: 'Invalid redirect_uri'}, 400, req);
    }

    const tokens = await exchangeCode(code, safeRedirect);
    const discordUser = await fetchDiscordUser(tokens.access_token);
    const supabase = adminClient();

    await ensureDiscordUserRow(supabase, discordUser);

    const {data: user, error: userErr} = await supabase
      .from('users')
      .select()
      .eq('discord_id', discordUser.id)
      .single();

    if (userErr) {
      return databaseErrorResponse(req, 'token-exchange user load', userErr);
    }

    if (typeof guild_id === 'string' && guild_id.trim()) {
      deferGuildCatalogUpsert(tokens.access_token, guild_id.trim());
    }

    return jsonResponse({
      access_token: tokens.access_token,
      user: {
        discordId: user.discord_id,
        username: discordUniqueUsername(discordUser),
        avatarUrl: avatarUrl(discordUser),
        xboxGamertag: user.xbox_gamertag,
        eventsJoined: user.events_joined,
        eventsHosted: user.events_hosted,
        attendanceRate: Number(user.attendance_rate),
        noShows: user.no_shows,
        hostRatingAvg: 0,
      },
    }, 200, req);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    if (detail.includes('Discord token exchange failed')) {
      console.error(JSON.stringify({msg: 'token-exchange discord oauth', detail}));
      return appErrorResponse(
        req,
        400,
        API_ERROR_CODES.BAD_REQUEST,
        'Discord sign-in failed. Try again.',
      );
    }
    return internalErrorResponse(req, e);
  }
});
