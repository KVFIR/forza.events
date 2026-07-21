import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {databaseErrorResponse, internalErrorResponse} from '../_shared/apiResponse.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {avatarUrl, discordUniqueUsername} from '../_shared/discord.ts';
import {requireDiscordUser} from '../_shared/discordRequestAuth.ts';
import {ensureDiscordUserRow} from '../_shared/discordUserRow.ts';
import {driverRatingFromRow} from '../_shared/driverRatingPayload.ts';
import {validateGamertag} from '../_shared/gamertag.ts';
import {rateLimitAuth} from '../_shared/rateLimitPresets.ts';
import {adminClient} from '../_shared/supabase.ts';

async function loadDriverRating(
  supabase: ReturnType<typeof adminClient>,
  discordId: string,
) {
  const {data} = await supabase
    .from('player_ratings')
    .select('rating, games_rated')
    .eq('discord_id', discordId)
    .maybeSingle();
  return driverRatingFromRow(data);
}

function userPayload(
  discordUser: {id: string},
  data: {
    discord_id: string;
    xbox_gamertag: string | null;
    events_joined: number;
    events_hosted: number;
    attendance_rate: number | string;
    no_shows: number;
    dm_notifications_enabled?: boolean | null;
    notification_locale?: string | null;
  },
  driverRating: ReturnType<typeof driverRatingFromRow>,
  username: string,
  avatar: string | null,
) {
  return {
    discordId: data.discord_id,
    username,
    avatarUrl: avatar,
    xboxGamertag: data.xbox_gamertag,
    eventsJoined: data.events_joined,
    eventsHosted: data.events_hosted,
    attendanceRate: Number(data.attendance_rate),
    noShows: data.no_shows,
    hostRatingAvg: 0,
    dmNotificationsEnabled: data.dm_notifications_enabled ?? true,
    notificationLocale: data.notification_locale === 'ru' ? 'ru' : 'en',
    driverRating,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST') return jsonResponse({error: 'Method not allowed'}, 405, req);

  const auth = await requireDiscordUser(req);
  if (auth instanceof Response) return auth;
  const {user: discordUser} = auth;

  const authLimited = await rateLimitAuth(req, discordUser.id);
  if (authLimited) return authLimited;

  try {
    const {xbox_gamertag, region, timezone, dm_notifications_enabled, notification_locale} = await req.json();
    const supabase = adminClient();

    let validatedGamertag: string | undefined;
    if (xbox_gamertag !== undefined) {
      const tag = validateGamertag(xbox_gamertag);
      if (!tag.ok) return jsonResponse({error: tag.error}, 400, req);
      validatedGamertag = tag.gamertag;
    }

    await ensureDiscordUserRow(supabase, discordUser);

    const updates: Record<string, unknown> = {};
    if (validatedGamertag !== undefined) updates.xbox_gamertag = validatedGamertag;
    if (region !== undefined) updates.region = region;
    if (timezone !== undefined) updates.timezone = timezone;
    if (dm_notifications_enabled !== undefined) {
      updates.dm_notifications_enabled = Boolean(dm_notifications_enabled);
    }
    if (notification_locale !== undefined) {
      const loc = String(notification_locale).split('-')[0];
      if (loc === 'en' || loc === 'ru') updates.notification_locale = loc;
    }

    if (Object.keys(updates).length === 0) {
      const {data, error} = await supabase
        .from('users')
        .select()
        .eq('discord_id', discordUser.id)
        .single();
      if (error) return databaseErrorResponse(req, 'user-profile', error);
      const driverRating = await loadDriverRating(supabase, discordUser.id);
      return jsonResponse({
        user: userPayload(
          discordUser,
          data,
          driverRating,
          discordUniqueUsername(discordUser),
          avatarUrl(discordUser),
        ),
      }, 200, req);
    }

    const {data, error} = await supabase
      .from('users')
      .update(updates)
      .eq('discord_id', discordUser.id)
      .select()
      .single();

    if (error) return databaseErrorResponse(req, 'user-profile', error);

    const driverRating = await loadDriverRating(supabase, discordUser.id);
    return jsonResponse({
      user: userPayload(
        discordUser,
        data,
        driverRating,
        discordUniqueUsername(discordUser),
        avatarUrl(discordUser),
      ),
    }, 200, req);
  } catch (e) {
    return internalErrorResponse(req, e);
  }
});
