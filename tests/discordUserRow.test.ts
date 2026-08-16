import {describe, expect, it, vi} from 'vitest';
import {PLACEHOLDER_USER_USERNAME} from '@edge/discord.ts';
import {ensureUserRowForDiscordId} from '@edge/discordUserRow.ts';

type UserRow = {
  discord_id: string;
  username: string;
  avatar_url: string | null;
};

function mockSupabaseForUserRow(initial: UserRow | null) {
  let row = initial;
  const insert = vi.fn(async (payload: UserRow) => {
    row = payload;
    return {error: null};
  });
  const update = vi.fn(async (patch: Partial<UserRow>) => {
    if (!row) throw new Error('no row');
    row = {...row, ...patch};
    return {error: null};
  });

  const supabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({data: row, error: null}),
        }),
      }),
      insert,
      update: (patch: Partial<UserRow>) => ({
        eq: async () => {
          await update(patch);
          return {error: null};
        },
      }),
    }),
  };

  return {supabase, insert, update, getRow: () => row};
}

describe('ensureUserRowForDiscordId', () => {
  it('does not overwrite username when profile is omitted', async () => {
    const {supabase, insert, update} = mockSupabaseForUserRow({
      discord_id: '9',
      username: 'real_handle',
      avatar_url: null,
    });

    await ensureUserRowForDiscordId(supabase as never, '9');

    expect(insert).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('inserts placeholder only for new rows without a handle', async () => {
    const {supabase, insert, getRow} = mockSupabaseForUserRow(null);

    await ensureUserRowForDiscordId(supabase as never, '9');

    expect(insert).toHaveBeenCalledOnce();
    expect(getRow()?.username).toBe(PLACEHOLDER_USER_USERNAME);
  });

  it('does not overwrite a real Discord handle or wipe an avatar', async () => {
    const {supabase, update, getRow} = mockSupabaseForUserRow({
      discord_id: '9',
      username: 'real_handle',
      avatar_url: 'https://cdn.discordapp.com/avatars/9/a.png',
    });

    await ensureUserRowForDiscordId(supabase as never, '9', {
      username: 'evil',
      avatar_url: null,
    });

    expect(update).not.toHaveBeenCalled();
    expect(getRow()?.username).toBe('real_handle');
    expect(getRow()?.avatar_url).toBe('https://cdn.discordapp.com/avatars/9/a.png');
  });

  it('upgrades a placeholder username and fills a missing avatar', async () => {
    const {supabase, update, getRow} = mockSupabaseForUserRow({
      discord_id: '9',
      username: PLACEHOLDER_USER_USERNAME,
      avatar_url: null,
    });

    await ensureUserRowForDiscordId(supabase as never, '9', {
      username: 'real_handle',
      avatar_url: 'https://cdn.discordapp.com/avatars/9/a.png',
    });

    expect(update).toHaveBeenCalledOnce();
    expect(getRow()?.username).toBe('real_handle');
    expect(getRow()?.avatar_url).toBe('https://cdn.discordapp.com/avatars/9/a.png');
  });
});
