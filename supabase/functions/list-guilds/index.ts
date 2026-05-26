import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {
  fetchUserGuilds,
  filterGuildsWithBot,
  publishTargetHint,
  userCanManageGuild,
  verifyDiscordToken,
} from '../_shared/discord.ts';
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
    const userGuilds = await fetchUserGuilds(token!);
    const manageable = userGuilds.filter((g) => userCanManageGuild(g.permissions));
    const candidates = manageable.length > 0 ? manageable : userGuilds;
    const withBot = await filterGuildsWithBot(candidates);

    const list = withBot
      .map((g) => ({
        id: g.id,
        name: g.name,
        icon_url: g.icon
          ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`
          : null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return jsonResponse({
      guilds: list,
      hint: list.length === 0 ? publishTargetHint() : null,
    }, 200, req);
  } catch (e) {
    console.error(e);
    return jsonResponse({error: String(e)}, 500, req);
  }
});
