import {ensureUserRowForDiscordId} from './discordUserRow.ts';
import type {adminClient} from './supabase.ts';
import type {SaveEventBody} from './eventSpec.ts';
import {VALIDATION_CODES, type ValidationCode} from './validationCodes.ts';

export type ResolvedLobbyLeader = {
  lobby_leader_discord_id: string;
  lobby_leader_is_host: boolean;
  lobby_leader_gamertag: string;
};

export async function resolveLobbyLeaderFields(
  body: SaveEventBody,
  hostDiscordId: string,
  supabase: ReturnType<typeof adminClient>,
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

  let gamertag = body.lobby_leader_gamertag?.trim() ?? '';
  if (!gamertag) {
    const {data: profile} = await supabase
      .from('users')
      .select('xbox_gamertag')
      .eq('discord_id', leaderId)
      .maybeSingle();
    gamertag = profile?.xbox_gamertag?.trim() ?? '';
  }
  if (!gamertag) return VALIDATION_CODES.CONVOY_LEADER_REQUIRED;

  await ensureUserRowForDiscordId(supabase, leaderId, {
    username: body.lobby_leader_display_name,
    avatar_url: body.lobby_leader_avatar_url,
  });

  return {
    lobby_leader_discord_id: leaderId,
    lobby_leader_is_host: false,
    lobby_leader_gamertag: gamertag,
  };
}
