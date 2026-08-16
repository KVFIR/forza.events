import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {databaseErrorResponse, internalErrorResponse, appErrorResponse} from '../_shared/apiResponse.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {
  avatarUrl,
  discordUniqueUsername,
  exchangeCode,
  fetchDiscordUser,
  refreshAccessToken,
  type DiscordOAuthTokens,
} from '../_shared/discord.ts';
import {deferGuildCatalogUpsert} from '../_shared/deferredGuildCatalog.ts';
import {ensureDiscordUserRow} from '../_shared/discordUserRow.ts';
import {resolveOAuthRedirectUri} from '../_shared/oauthRedirect.ts';
import {API_ERROR_CODES} from '../_shared/apiErrorCodes.ts';
import {rateLimitOAuthExchange} from '../_shared/rateLimitPresets.ts';
import {adminClient} from '../_shared/supabase.ts';

async function tokenExchangeUserPayload(tokens: DiscordOAuthTokens, guildId?: string) {
  const discordUser = await fetchDiscordUser(tokens.access_token);
  const supabase = adminClient();

  await ensureDiscordUserRow(supabase, discordUser);

  const {data: user, error: userErr} = await supabase
    .from('users')
    .select()
    .eq('discord_id', discordUser.id)
    .single();

  if (userErr) {
    return {error: userErr as {message?: string; code?: string}};
  }

  if (typeof guildId === 'string' && guildId.trim()) {
    deferGuildCatalogUpsert(tokens.access_token, guildId.trim());
  }

  return {
    payload: {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_in: tokens.expires_in,
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
        dmNotificationsEnabled: user.dm_notifications_enabled ?? true,
        newEventNotificationsEnabled: user.new_event_notifications_enabled === true,
        notificationLocale: user.notification_locale === 'ru' ? 'ru' : 'en',
      },
    },
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST') {
    return jsonResponse({error: 'Method not allowed'}, 405, req);
  }

  try {
    const body = await req.json();
    const refreshToken =
      typeof body.refresh_token === 'string' ? body.refresh_token.trim() : '';
    const code = typeof body.code === 'string' ? body.code : '';
    const guild_id = body.guild_id;
    const redirect_uri = body.redirect_uri;

    if (!refreshToken && !code) {
      return jsonResponse({error: 'Missing code or refresh_token'}, 400, req);
    }

    const oauthLimited = await rateLimitOAuthExchange(req);
    if (oauthLimited) return oauthLimited;

    let tokens: DiscordOAuthTokens;
    if (refreshToken) {
      try {
        tokens = await refreshAccessToken(refreshToken);
      } catch (e) {
        const detail = e instanceof Error ? e.message : String(e);
        console.error(JSON.stringify({msg: 'token-exchange discord refresh', detail}));
        return appErrorResponse(
          req,
          401,
          API_ERROR_CODES.UNAUTHORIZED,
          'Discord session expired. Sign in again.',
        );
      }
    } else {
      let safeRedirect: string;
      try {
        safeRedirect = resolveOAuthRedirectUri(redirect_uri);
      } catch {
        return jsonResponse({error: 'Invalid redirect_uri'}, 400, req);
      }

      tokens = await exchangeCode(code, safeRedirect);
    }

    const result = await tokenExchangeUserPayload(
      tokens,
      typeof guild_id === 'string' ? guild_id : undefined,
    );
    if (result.error) {
      return databaseErrorResponse(req, 'token-exchange user load', result.error);
    }

    return jsonResponse(result.payload, 200, req);
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
