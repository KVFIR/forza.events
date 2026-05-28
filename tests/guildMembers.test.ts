import {describe, expect, it} from 'vitest';
import {mapGuildMemberSearchRow} from '@edge/guildMembers.ts';

describe('mapGuildMemberSearchRow', () => {
  it('stores Discord handle, not server nick or global_name', () => {
    const hit = mapGuildMemberSearchRow({
      nick: 'Server Nick',
      user: {
        id: '1',
        username: 'unique_handle',
        global_name: 'Display Name',
        avatar: null,
      },
    });
    expect(hit).toEqual({
      discord_id: '1',
      username: 'unique_handle',
      avatar_url: expect.stringContaining('cdn.discordapp.com'),
    });
  });

  it('returns null when user id is missing', () => {
    expect(mapGuildMemberSearchRow({nick: 'x', user: {id: '', username: 'a'}})).toBeNull();
  });
});
