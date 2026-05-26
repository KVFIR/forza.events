import {
  BOT_CANNOT_POST_MESSAGE,
  botCanPostInChannel,
  fetchGuildChannels,
  fetchGuildMember,
  fetchGuildRoles,
  getBotUserId,
  type DiscordTextChannel,
} from './channelPermissions.ts';
import {botIsInGuild} from './discord.ts';

export type PublishTargetValidation =
  | {ok: true; channel: DiscordTextChannel}
  | {ok: false; error: string};

/** Bot can post in channel; channel belongs to guild. Used by validate-channel and publish-event. */
export async function validatePublishChannelTarget(
  guildId: string,
  channelId: string,
): Promise<PublishTargetValidation> {
  const botInstalled = await botIsInGuild(guildId);
  if (!botInstalled) {
    return {
      ok: false,
      error:
        'FORZA.EVENTS is not installed in this server. Add the app to the server first.',
    };
  }

  const channels = await fetchGuildChannels(guildId);
  const channelsById = new Map(channels.map((c) => [c.id, c]));
  const channel = channelsById.get(channelId);
  if (!channel) {
    return {
      ok: false,
      error: 'Channel not found. Choose another channel or refresh the list.',
    };
  }
  if (channel.type !== 0) {
    return {ok: false, error: 'Only text channels can be used for announcements.'};
  }
  if (channel.guild_id && channel.guild_id !== guildId) {
    return {ok: false, error: 'Channel does not belong to the selected server.'};
  }

  const botId = await getBotUserId();
  const [roles, member] = await Promise.all([
    fetchGuildRoles(guildId),
    fetchGuildMember(guildId, botId),
  ]);
  if (!member) {
    return {ok: false, error: 'Bot is not a member of this server.'};
  }

  const canPost = await botCanPostInChannel(guildId, channel, {
    roles,
    member,
    channelsById,
  });
  if (!canPost) {
    return {ok: false, error: BOT_CANNOT_POST_MESSAGE};
  }

  return {ok: true, channel};
}
