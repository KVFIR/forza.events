import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {corsHeaders, jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {avatarUrl, exchangeCode, fetchDiscordUser} from '../_shared/discord.ts';
import {adminClient} from '../_shared/supabase.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') {
    return jsonResponse({error: 'Method not allowed'}, 405);
  }

  try {
    const {code, guild_id, guild_name} = await req.json();
    if (!code) {
      return jsonResponse({error: 'Missing code'}, 400);
    }

    const tokens = await exchangeCode(code);
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
      return jsonResponse({error: 'Failed to upsert user'}, 500);
    }

    if (guild_id && guild_name) {
      await supabase.from('discord_guilds').upsert(
        {guild_id, guild_name},
        {onConflict: 'guild_id'},
      );
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
    });
  } catch (e) {
    console.error(e);
    return jsonResponse({error: String(e)}, 500);
  }
});
