import {fetchDiscordUserById, isUserMemberOfGuild} from './discord.ts';
import {ensureUserRowForDiscordId, resolveDiscordHandleForUserId} from './discordUserRow.ts';
import type {adminClient} from './supabase.ts';
import type {SaveEventBody} from './eventSpec.ts';
import {VALIDATION_CODES, type ValidationCode} from './validationCodes.ts';

export type ResolvedLobbyLeader = {
  lobby_leader_discord_id: string;
  lobby_leader_is_host: boolean;
  lobby_leader_gamertag: string;
};

export type ResolveLobbyLeaderOptions = {
  guildId?: string | null;
};

export async function resolveLobbyLeaderFields(
  body: SaveEventBody,
  hostDiscordId: string,
  supabase: ReturnType<typeof adminClient>,
  options: ResolveLobbyLeaderOptions = {},
): Promise<ResolvedLobbyLeader | ValidationCode> {
  const isHost = body.lobby_leader_is_host !== false;

  if (isHost) {
    const gamertag = body.lobby_leader_gamertag?.trim();
    if (!gamertag) return VALIDATION_CODES.CONVOY_LEADER_REQUIRED;
    return {
      lobby_leader_discord_id: hostDiscordId,
      lobby_leader_is_host: true,
      lobby_leader_gamertag: gamertag,
    };
  }

  const leaderId = body.lobby_leader_discord_id?.trim();
  if (!leaderId) return VALIDATION_CODES.CONVOY_LEADER_DISCORD_REQUIRED;
  if (leaderId === hostDiscordId) return VALIDATION_CODES.CONVOY_LEADER_DISCORD_REQUIRED;

  const guildId = options.guildId?.trim() || body.guild_id?.trim();
  if (!guildId) return VALIDATION_CODES.GUILD_REQUIRED;

  try {
    const inGuild = await isUserMemberOfGuild(guildId, leaderId);
    if (!inGuild) return VALIDATION_CODES.CONVOY_LEADER_NOT_IN_GUILD;
  } catch (e) {
    console.error(
      JSON.stringify({
        msg: 'Convoy leader guild membership check failed',
        guildId,
        leaderId,
        error: e instanceof Error ? e.message : String(e),
      }),
    );
    return VALIDATION_CODES.CONVOY_LEADER_GUILD_CHECK_FAILED;
  }

  const {data: existingUser} = await supabase
    .from('users')
    .select('username, xbox_gamertag, avatar_url')
    .eq('discord_id', leaderId)
    .maybeSingle();

  let gamertag = body.lobby_leader_gamertag?.trim() ?? '';
  if (!gamertag) {
    gamertag = existingUser?.xbox_gamertag?.trim() ?? '';
  }
  if (!gamertag) return VALIDATION_CODES.CONVOY_LEADER_REQUIRED;

  let leaderHandle: string | null;
  try {
    leaderHandle = await resolveDiscordHandleForUserId(leaderId, {
      bodyHandle: body.lobby_leader_username,
      existingUsername: existingUser?.username,
      fetchById: fetchDiscordUserById,
    });
  } catch (e) {
    console.error(
      JSON.stringify({
        msg: 'Convoy leader Discord handle lookup failed',
        leaderId,
        error: e instanceof Error ? e.message : String(e),
      }),
    );
    return VALIDATION_CODES.CONVOY_LEADER_HANDLE_REQUIRED;
  }

  if (!leaderHandle) {
    return VALIDATION_CODES.CONVOY_LEADER_HANDLE_REQUIRED;
  }

  await ensureUserRowForDiscordId(supabase, leaderId, {
    username: leaderHandle,
    avatar_url: body.lobby_leader_avatar_url ?? existingUser?.avatar_url,
  });

  return {
    lobby_leader_discord_id: leaderId,
    lobby_leader_is_host: false,
    lobby_leader_gamertag: gamertag,
  };
}
