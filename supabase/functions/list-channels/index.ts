import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  botCanPostInChannel,
  fetchGuildMember,
  fetchGuildRoles,
  getBotUserId,
  type DiscordTextChannel,
} from '../_shared/channelPermissions.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {botHeaders, isBotInGuild, verifyDiscordToken} from '../_shared/discord.ts';
import {userIsGuildMember, userCanManageGuildById} from '../_shared/guildAccess.ts';
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

    if (!(await userIsGuildMember(token!, guild_id))) {
      return jsonResponse({error: 'Forbidden'}, 403, req);
    }
    if (!(await userCanManageGuildById(token!, guild_id))) {
      return jsonResponse(
        {error: 'You need Manage Server permission to choose publish channels.'},
        403,
        req,
      );
    }

    const botInstalled = await isBotInGuild(guild_id);
    if (!botInstalled) {
      return jsonResponse(
        {error: 'FORZA.EVENTS is not installed in this server. Add the app to the server first.'},
        400,
        req,
      );
    }

    const res = await fetch(`https://discord.com/api/v10/guilds/${guild_id}/channels`, {
      headers: botHeaders(),
    });
    if (!res.ok) {
      return jsonResponse({error: 'Failed to list channels'}, 502, req);
    }

    const channels = (await res.json()) as DiscordTextChannel[];
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

    const context = {roles, member};
    const postable: {id: string; name: string; position: number}[] = [];
    for (const channel of text) {
      const canPost = await botCanPostInChannel(guild_id, channel, context);
      if (canPost) postable.push({id: channel.id, name: channel.name, position: channel.position});
    }

    return jsonResponse({
      channels: postable,
      hint:
        postable.length === 0
          ? 'No text channels where FORZA.EVENTS can post. Check channel permissions for the bot role.'
          : null,
    }, 200, req);
  } catch (e) {
    console.error(e);
    return jsonResponse({error: String(e)}, 500, req);
  }
});
