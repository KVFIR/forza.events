import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {internalErrorResponse} from '../_shared/apiResponse.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {avatarUrl, exchangeCode, fetchDiscordUser} from '../_shared/discord.ts';
import {resolveGuildNameForUser} from '../_shared/guildAccess.ts';
import {resolveOAuthRedirectUri} from '../_shared/oauthRedirect.ts';
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
    const displayName = discordUser.global_name ?? discordUser.username;
    const supabase = adminClient();

    const {data: user, error: userErr} = await supabase
      .from('users')
      .upsert(
        {
          discord_id: discordUser.id,
          username: displayName,
          discriminator: discordUser.discriminator ?? '',
          avatar_url: avatarUrl(discordUser),
        },
        {onConflict: 'discord_id'},
      )
      .select()
      .single();

    if (userErr) {
      console.error(userErr);
      return jsonResponse({error: 'Failed to upsert user'}, 500, req);
    }

    if (guild_id) {
      const canonicalName = await resolveGuildNameForUser(
        tokens.access_token,
        guild_id,
      );
      if (canonicalName) {
        await supabase.from('discord_guilds').upsert(
          {guild_id, guild_name: canonicalName},
          {onConflict: 'guild_id'},
        );
      }
    }

    return jsonResponse({
      access_token: tokens.access_token,
      user: {
        discordId: user.discord_id,
        username: user.username,
        avatarUrl: user.avatar_url,
        xboxGamertag: user.xbox_gamertag,
        eventsJoined: user.events_joined,
        eventsHosted: user.events_hosted,
        attendanceRate: Number(user.attendance_rate),
        noShows: user.no_shows,
        hostRatingAvg: 0,
      },
    }, 200, req);
  } catch (e) {
    return internalErrorResponse(req, e);
  }
});
