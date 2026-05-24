import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {verifyDiscordToken} from '../_shared/discord.ts';
import {adminClient} from '../_shared/supabase.ts';

const GAMERTAG_RE = /^[a-zA-Z0-9 ]{1,15}$/;

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') return jsonResponse({error: 'Method not allowed'}, 405);

  const token =
    req.headers.get('x-discord-access-token') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const discordUser = await verifyDiscordToken(token);
  if (!discordUser) return jsonResponse({error: 'Unauthorized'}, 401);

  try {
    const {xbox_gamertag, region, timezone} = await req.json();

    if (xbox_gamertag !== undefined) {
      const gt = String(xbox_gamertag).trim();
      if (!GAMERTAG_RE.test(gt)) {
        return jsonResponse(
          {error: 'Gamertag must be 1–15 alphanumeric characters or spaces'},
          400,
        );
      }
    }

    const updates: Record<string, unknown> = {};
    if (xbox_gamertag !== undefined) updates.xbox_gamertag = String(xbox_gamertag).trim();
    if (region !== undefined) updates.region = region;
    if (timezone !== undefined) updates.timezone = timezone;

    const supabase = adminClient();
    const {data, error} = await supabase
      .from('users')
      .update(updates)
      .eq('discord_id', discordUser.id)
      .select()
      .single();

    if (error) return jsonResponse({error: error.message}, 500);

    return jsonResponse({
      user: {
        discordId: data.discord_id,
        username: data.username,
        avatarUrl: data.avatar_url,
        xboxGamertag: data.xbox_gamertag,
        eventsJoined: data.events_joined,
        eventsHosted: data.events_hosted,
        attendanceRate: Number(data.attendance_rate),
        noShows: data.no_shows,
        hostRatingAvg: 0,
      },
    });
  } catch (e) {
    console.error(e);
    return jsonResponse({error: String(e)}, 500);
  }
});
