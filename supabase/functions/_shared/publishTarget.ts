import {
  botCanPostInChannel,
  fetchGuildChannels,
  fetchGuildMember,
  fetchGuildRoles,
  getBotUserId,
  type DiscordTextChannel,
} from './channelPermissions.ts';
import {botIsInGuild} from './discord.ts';
import {API_ERROR_CODES, type ApiErrorCode} from './apiErrorCodes.ts';
import {apiErrorMessage} from './apiResponse.ts';

export type PublishTargetValidation =
  | {ok: true; channel: DiscordTextChannel}
  | {ok: false; code: ApiErrorCode; error: string};

/** Bot can post in channel; channel belongs to guild. Used by validate-channel and publish-event. */
export async function validatePublishChannelTarget(
  guildId: string,
  channelId: string,
): Promise<PublishTargetValidation> {
  const botInstalled = await botIsInGuild(guildId);
  if (!botInstalled) {
    const code = API_ERROR_CODES.BOT_NOT_IN_GUILD;
    return {ok: false, code, error: apiErrorMessage(code)};
  }

  const channels = await fetchGuildChannels(guildId);
  const channelsById = new Map(channels.map((c) => [c.id, c]));
  const channel = channelsById.get(channelId);
  if (!channel) {
    const code = API_ERROR_CODES.CHANNEL_NOT_FOUND;
    return {ok: false, code, error: apiErrorMessage(code)};
  }
  if (channel.type !== 0) {
    const code = API_ERROR_CODES.CHANNEL_NOT_TEXT;
    return {ok: false, code, error: apiErrorMessage(code)};
  }
  if (channel.guild_id && channel.guild_id !== guildId) {
    const code = API_ERROR_CODES.CHANNEL_WRONG_GUILD;
    return {ok: false, code, error: apiErrorMessage(code)};
  }

  const botId = await getBotUserId();
  const [roles, member] = await Promise.all([
    fetchGuildRoles(guildId),
    fetchGuildMember(guildId, botId),
  ]);
  if (!member) {
    const code = API_ERROR_CODES.BOT_NOT_GUILD_MEMBER;
    return {ok: false, code, error: apiErrorMessage(code)};
  }

  const canPost = await botCanPostInChannel(guildId, channel, {
    roles,
    member,
    channelsById,
  });
  if (!canPost) {
    const code = API_ERROR_CODES.BOT_CANNOT_POST;
    return {ok: false, code, error: apiErrorMessage(code)};
  }

  return {ok: true, channel};
}
