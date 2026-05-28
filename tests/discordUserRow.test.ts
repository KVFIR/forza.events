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

  it('updates username when a new handle is provided', async () => {
    const {supabase, update, getRow} = mockSupabaseForUserRow({
      discord_id: '9',
      username: 'old_display',
      avatar_url: null,
    });

    await ensureUserRowForDiscordId(supabase as never, '9', {username: 'new_handle'});

    expect(update).toHaveBeenCalledOnce();
    expect(getRow()?.username).toBe('new_handle');
  });
});
