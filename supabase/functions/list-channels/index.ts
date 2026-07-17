import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  botCanPostInChannel,
  fetchGuildChannels,
  fetchGuildMember,
  fetchGuildRoles,
  getBotUserId,
  LIST_CHANNELS_HINT_CODES,
  type ListChannelsHintCode,
} from '../_shared/channelPermissions.ts';
import {API_ERROR_CODES} from '../_shared/apiErrorCodes.ts';
import {appErrorResponse, internalErrorResponse} from '../_shared/apiResponse.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {botIsInGuild, verifyDiscordToken} from '../_shared/discord.ts';
import {requireManageGuildAccess} from '../_shared/guildAccess.ts';
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
    const {guild_id} = await req.json();
    if (!guild_id) return jsonResponse({error: 'Missing guild_id'}, 400, req);

    try {
      await requireManageGuildAccess(token!, guild_id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === 'Forbidden') return jsonResponse({error: 'Forbidden'}, 403, req);
      return jsonResponse({error: msg}, 403, req);
    }

    if (!(await botIsInGuild(guild_id))) {
      return jsonResponse(
        {error: 'FORZA.EVENTS is not installed in this server. Add the app to the server first.'},
        400,
        req,
      );
    }

    const channels = await fetchGuildChannels(guild_id);
    const channelsById = new Map(channels.map((c) => [c.id, c]));
    const text = channels
      .filter((c) => c.type === 0)
      .sort((a, b) => a.position - b.position);

    const botId = await getBotUserId();
    const [roles, member] = await Promise.all([
      fetchGuildRoles(guild_id),
      fetchGuildMember(guild_id, botId),
    ]);

    if (!member) {
      return jsonResponse({error: 'Bot is not a member of this server.'}, 400, req);
    }

    const context = {roles, member, channelsById};
    const postable: {id: string; name: string; position: number}[] = [];
    for (const channel of text) {
      const canPost = await botCanPostInChannel(guild_id, channel, context);
      if (canPost) postable.push({id: channel.id, name: channel.name, position: channel.position});
    }

    return jsonResponse({
      channels: postable,
      hint_code: (text.length === 0
        ? LIST_CHANNELS_HINT_CODES.NO_TEXT_CHANNELS
        : postable.length === 0
          ? LIST_CHANNELS_HINT_CODES.NO_PERMITTED_CHANNELS
          : null) satisfies ListChannelsHintCode | null,
    }, 200, req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('rate limit')) {
      return appErrorResponse(req, 429, API_ERROR_CODES.TOO_MANY_REQUESTS);
    }
    return internalErrorResponse(req, e);
  }
});
