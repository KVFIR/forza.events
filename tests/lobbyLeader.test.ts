import {beforeEach, describe, expect, it, vi} from 'vitest';
import {VALIDATION_CODES} from '@edge/validationCodes.ts';

const isUserMemberOfGuild = vi.fn();
const fetchDiscordUserById = vi.fn();
const resolveDiscordHandleForUserId = vi.fn();
const ensureUserRowForDiscordId = vi.fn();

vi.mock('@edge/discord.ts', () => ({
  fetchDiscordUserById,
  isUserMemberOfGuild,
}));

vi.mock('@edge/discordUserRow.ts', () => ({
  ensureUserRowForDiscordId,
  resolveDiscordHandleForUserId,
}));

function mockSupabase() {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({data: null, error: null}),
        }),
      }),
    }),
  };
}

const baseBody = {
  lobby_leader_is_host: false,
  lobby_leader_discord_id: 'leader-1',
  lobby_leader_gamertag: 'LeaderTag',
  guild_id: 'guild-1',
} as const;

describe('resolveLobbyLeaderFields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveDiscordHandleForUserId.mockResolvedValue('leader_handle');
    ensureUserRowForDiscordId.mockResolvedValue(undefined);
  });

  it('skips guild check when host is convoy leader', async () => {
    const {resolveLobbyLeaderFields} = await import('@edge/lobbyLeader.ts');
    const result = await resolveLobbyLeaderFields(
      {
        lobby_leader_is_host: true,
        lobby_leader_gamertag: 'HostTag',
      },
      'host-1',
      mockSupabase() as never,
    );
    expect(result).toMatchObject({
      lobby_leader_discord_id: 'host-1',
      lobby_leader_is_host: true,
    });
    expect(isUserMemberOfGuild).not.toHaveBeenCalled();
  });

  it('returns GUILD_REQUIRED when guild is missing', async () => {
    const {resolveLobbyLeaderFields} = await import('@edge/lobbyLeader.ts');
    const result = await resolveLobbyLeaderFields(
      {...baseBody, guild_id: undefined},
      'host-1',
      mockSupabase() as never,
    );
    expect(result).toBe(VALIDATION_CODES.GUILD_REQUIRED);
    expect(isUserMemberOfGuild).not.toHaveBeenCalled();
  });

  it('returns NOT_IN_GUILD when leader is not a member', async () => {
    isUserMemberOfGuild.mockResolvedValue(false);
    const {resolveLobbyLeaderFields} = await import('@edge/lobbyLeader.ts');
    const result = await resolveLobbyLeaderFields(
      baseBody,
      'host-1',
      mockSupabase() as never,
    );
    expect(result).toBe(VALIDATION_CODES.CONVOY_LEADER_NOT_IN_GUILD);
  });

  it('returns GUILD_CHECK_FAILED when Discord lookup fails', async () => {
    isUserMemberOfGuild.mockRejectedValue(new Error('Guild member lookup failed: 503'));
    const {resolveLobbyLeaderFields} = await import('@edge/lobbyLeader.ts');
    const result = await resolveLobbyLeaderFields(
      baseBody,
      'host-1',
      mockSupabase() as never,
    );
    expect(result).toBe(VALIDATION_CODES.CONVOY_LEADER_GUILD_CHECK_FAILED);
  });

  it('resolves external leader when in guild', async () => {
    isUserMemberOfGuild.mockResolvedValue(true);
    const {resolveLobbyLeaderFields} = await import('@edge/lobbyLeader.ts');
    const result = await resolveLobbyLeaderFields(
      baseBody,
      'host-1',
      mockSupabase() as never,
    );
    expect(result).toMatchObject({
      lobby_leader_discord_id: 'leader-1',
      lobby_leader_is_host: false,
      lobby_leader_gamertag: 'LeaderTag',
    });
    expect(fetchDiscordUserById).not.toHaveBeenCalled();
  });
});
