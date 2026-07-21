import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {API_ERROR_CODES} from '../_shared/apiErrorCodes.ts';
import {appErrorResponse, internalErrorResponse} from '../_shared/apiResponse.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {fetchUserGuilds, filterGuildsWithBot, publishTargetHint} from '../_shared/discord.ts';
import {requireDiscordUser} from '../_shared/discordRequestAuth.ts';
import {resolveListGuildCandidates} from '../_shared/listGuildCandidates.ts';
import {rateLimitAuth} from '../_shared/rateLimitPresets.ts';
import {adminClient} from '../_shared/supabase.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST') return jsonResponse({error: 'Method not allowed'}, 405, req);

  const auth = await requireDiscordUser(req);
  if (auth instanceof Response) return auth;
  const {user, token} = auth;

  const authLimited = await rateLimitAuth(req, user.id);
  if (authLimited) return authLimited;

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const dmReachability = body?.dm_reachability === true;
    const fresh = body?.fresh === true;

    const userGuilds = await fetchUserGuilds(token);
    const candidates = resolveListGuildCandidates(userGuilds, dmReachability);
    const withBot = await filterGuildsWithBot(
      candidates,
      dmReachability && fresh ? {fresh: true} : undefined,
    );

    const supabase = adminClient();
    const guildIds = withBot.map((g) => g.id);
    const enabled = new Set<string>();
    if (guildIds.length > 0) {
      const {data: rows} = await supabase
        .from('rating_enabled_guilds')
        .select('guild_id')
        .in('guild_id', guildIds);
      for (const row of rows ?? []) enabled.add(String(row.guild_id));
    }

    const list = withBot
      .map((g) => ({
        id: g.id,
        name: g.name,
        icon_url: g.icon
          ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`
          : null,
        rating_enabled: enabled.has(g.id),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return jsonResponse({
      guilds: list,
      hint: list.length === 0
        ? (dmReachability
          ? 'Add FORZA.EVENTS to a Discord server you share to receive DMs.'
          : publishTargetHint())
        : null,
    }, 200, req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('rate limit')) {
      return appErrorResponse(req, 429, API_ERROR_CODES.TOO_MANY_REQUESTS);
    }
    return internalErrorResponse(req, e);
  }
});
