import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {databaseErrorResponse, internalErrorResponse} from '../_shared/apiResponse.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {avatarUrl, discordUniqueUsername, verifyDiscordToken} from '../_shared/discord.ts';
import {ensureDiscordUserRow} from '../_shared/discordUserRow.ts';
import {validateGamertag} from '../_shared/gamertag.ts';
import {rateLimitAuth} from '../_shared/rateLimitPresets.ts';
import {adminClient} from '../_shared/supabase.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST') return jsonResponse({error: 'Method not allowed'}, 405, req);

  const token =
    req.headers.get('x-discord-access-token') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const discordUser = await verifyDiscordToken(token);
  if (!discordUser) return jsonResponse({error: 'Unauthorized'}, 401, req);

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
    const {data, error} = await supabase
      .from('users')
      .update(updates)
      .eq('discord_id', discordUser.id)
      .select()
      .single();

    if (error) return databaseErrorResponse(req, 'user-profile', error);

    return jsonResponse({
      user: {
        discordId: data.discord_id,
        username: discordUniqueUsername(discordUser),
        avatarUrl: avatarUrl(discordUser),
        xboxGamertag: data.xbox_gamertag,
        eventsJoined: data.events_joined,
        eventsHosted: data.events_hosted,
        attendanceRate: Number(data.attendance_rate),
        noShows: data.no_shows,
        hostRatingAvg: 0,
        dmNotificationsEnabled: data.dm_notifications_enabled ?? true,
        notificationLocale: data.notification_locale === 'ru' ? 'ru' : 'en',
      },
    }, 200, req);
  } catch (e) {
    return internalErrorResponse(req, e);
  }
});
