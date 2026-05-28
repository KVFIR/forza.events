import {describe, expect, it, vi} from 'vitest';
import {
  isDiscordHandle,
  PLACEHOLDER_USER_USERNAME,
  type DiscordUser,
} from '@edge/discord.ts';
import {resolveDiscordHandleForUserId} from '@edge/discordUserRow.ts';

describe('isDiscordHandle', () => {
  it('accepts Discord login handles', () => {
    expect(isDiscordHandle('racer_one')).toBe(true);
    expect(isDiscordHandle('User.name_2')).toBe(true);
  });

  it('rejects display names, placeholder, and empty', () => {
    expect(isDiscordHandle('Display Name')).toBe(false);
    expect(isDiscordHandle(PLACEHOLDER_USER_USERNAME)).toBe(false);
    expect(isDiscordHandle('')).toBe(false);
    expect(isDiscordHandle(null)).toBe(false);
  });
});

describe('resolveDiscordHandleForUserId', () => {
  const fetchById = vi.fn<(id: string) => Promise<DiscordUser>>();

  it('prefers valid body handle over DB and API', async () => {
    fetchById.mockReset();
    const handle = await resolveDiscordHandleForUserId('1', {
      bodyHandle: 'from_body',
      existingUsername: 'from_db',
      fetchById,
    });
    expect(handle).toBe('from_body');
    expect(fetchById).not.toHaveBeenCalled();
  });

  it('ignores invalid body handle and falls back to API', async () => {
    fetchById.mockReset();
    fetchById.mockResolvedValue({id: '1', username: 'api_handle'});
    const handle = await resolveDiscordHandleForUserId('1', {
      bodyHandle: 'Display Name',
      existingUsername: 'Old Display Name',
      fetchById,
    });
    expect(handle).toBe('api_handle');
    expect(fetchById).toHaveBeenCalledWith('1');
  });

  it('uses valid DB handle without calling Discord API', async () => {
    fetchById.mockReset();
    const handle = await resolveDiscordHandleForUserId('1', {
      existingUsername: 'stored_handle',
      fetchById,
    });
    expect(handle).toBe('stored_handle');
    expect(fetchById).not.toHaveBeenCalled();
  });

  it('fetches from Discord when DB has a display name', async () => {
    fetchById.mockReset();
    fetchById.mockResolvedValue({
      id: '1',
      username: 'api_handle',
    });
    const handle = await resolveDiscordHandleForUserId('1', {
      existingUsername: 'Old Display Name',
      fetchById,
    });
    expect(handle).toBe('api_handle');
    expect(fetchById).toHaveBeenCalledWith('1');
  });
});
