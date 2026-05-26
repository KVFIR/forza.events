import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  BOT_CANNOT_POST_MESSAGE,
  botCanPostInChannel,
  type DiscordTextChannel,
} from '../_shared/channelPermissions.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {botHeaders, isBotInGuild, verifyDiscordToken} from '../_shared/discord.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') return jsonResponse({error: 'Method not allowed'}, 405);

  const token =
    req.headers.get('x-discord-access-token') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const user = await verifyDiscordToken(token);
  if (!user) return jsonResponse({error: 'Unauthorized'}, 401);

  try {
    const {guild_id, channel_id} = await req.json();
    if (!guild_id || !channel_id) {
      return jsonResponse({error: 'Missing guild_id or channel_id'}, 400);
    }

    const botInstalled = await isBotInGuild(guild_id);
    if (!botInstalled) {
      return jsonResponse({
        ok: false,
        error: 'FORZA.EVENTS is not installed in this server. Add the app to the server first.',
      });
    }

    const channelRes = await fetch(`https://discord.com/api/v10/channels/${channel_id}`, {
      headers: botHeaders(),
    });
    if (!channelRes.ok) {
      return jsonResponse({
        ok: false,
        error: 'Channel not found. Choose another channel or refresh the list.',
      });
    }

    const channel = (await channelRes.json()) as DiscordTextChannel;
    if (channel.type !== 0) {
      return jsonResponse({ok: false, error: 'Only text channels can be used for announcements.'});
    }
    if (channel.guild_id && channel.guild_id !== guild_id) {
      return jsonResponse({ok: false, error: 'Channel does not belong to the selected server.'});
    }

    const canPost = await botCanPostInChannel(guild_id, channel);
    if (!canPost) {
      return jsonResponse({ok: false, error: BOT_CANNOT_POST_MESSAGE});
    }

    return jsonResponse({ok: true});
  } catch (e) {
    console.error(e);
    return jsonResponse({error: String(e)}, 500);
  }
});
