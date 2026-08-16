import {describe, expect, it} from 'vitest';
import {userCanManageGuild} from '../supabase/functions/_shared/discord.ts';
import {
  isDeniedManageGuildError,
  MANAGE_GUILD_REQUIRED,
  memberRolesAllowManageGuild,
} from '../supabase/functions/_shared/guildAccess.ts';

const MANAGE_GUILD = String(0x20);
const ADMINISTRATOR = String(0x8);
const NONE = '0';

describe('userCanManageGuild', () => {
  it('accepts Manage Server and Administrator bits', () => {
    expect(userCanManageGuild(MANAGE_GUILD)).toBe(true);
    expect(userCanManageGuild(ADMINISTRATOR)).toBe(true);
    expect(userCanManageGuild(NONE)).toBe(false);
    expect(userCanManageGuild(undefined)).toBe(false);
  });

  it('accepts guild owner even when OAuth permissions omit implicit bits', () => {
    expect(userCanManageGuild(NONE, true)).toBe(true);
    expect(userCanManageGuild(undefined, true)).toBe(true);
    expect(userCanManageGuild(NONE, false)).toBe(false);
  });
});

describe('memberRolesAllowManageGuild', () => {
  const guildId = 'guild-1';
  const member = {user: {id: 'user-1'}, roles: ['role-mod']};

  it('reads Manage Server from assigned roles, not the OAuth bitfield', () => {
    expect(
      memberRolesAllowManageGuild(guildId, member, [
        {id: guildId, permissions: NONE, position: 0},
        {id: 'role-mod', permissions: MANAGE_GUILD, position: 1},
      ]),
    ).toBe(true);
  });

  it('rejects members whose roles do not include Manage Server', () => {
    expect(
      memberRolesAllowManageGuild(guildId, member, [
        {id: guildId, permissions: NONE, position: 0},
        {id: 'role-mod', permissions: NONE, position: 1},
      ]),
    ).toBe(false);
  });

  it('accepts Administrator on an assigned role', () => {
    expect(
      memberRolesAllowManageGuild(guildId, member, [
        {id: guildId, permissions: NONE, position: 0},
        {id: 'role-mod', permissions: ADMINISTRATOR, position: 1},
      ]),
    ).toBe(true);
  });
});

describe('isDeniedManageGuildError', () => {
  it('matches Forbidden and the Manage Server copy only', () => {
    expect(isDeniedManageGuildError(new Error('Forbidden'))).toBe(true);
    expect(isDeniedManageGuildError(new Error(MANAGE_GUILD_REQUIRED))).toBe(true);
    expect(
      isDeniedManageGuildError(
        new Error('Discord rate limit — wait a few seconds and try again.'),
      ),
    ).toBe(false);
  });
});
