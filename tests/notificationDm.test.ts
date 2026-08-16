import {describe, expect, it} from 'vitest';
import {
  notificationToggleActive,
  shouldPromptBotInstallForNotifications,
} from '../src/lib/notificationDm';
import {resolveListGuildCandidates} from '../supabase/functions/_shared/listGuildCandidates.ts';

const MANAGE_GUILD = String(0x20);
const MEMBER_ONLY = '0';

describe('notificationDm', () => {
  it('shows toggle on only when pref, check, and reachability align', () => {
    expect(notificationToggleActive(true, true, true)).toBe(true);
    expect(notificationToggleActive(true, true, false)).toBe(false);
    expect(notificationToggleActive(true, false, true)).toBe(false);
    expect(notificationToggleActive(false, true, true)).toBe(false);
  });

  it('prompts bot install only after a verified unreachable result', () => {
    expect(shouldPromptBotInstallForNotifications(true, false)).toBe(true);
    expect(shouldPromptBotInstallForNotifications(false, false)).toBe(false);
    expect(shouldPromptBotInstallForNotifications(true, true)).toBe(false);
  });
});

describe('resolveListGuildCandidates', () => {
  const guilds = [
    {id: '1', name: 'Managed no bot', icon: null, permissions: MANAGE_GUILD},
    {id: '2', name: 'Member with bot', icon: null, permissions: MEMBER_ONLY},
  ];

  it('uses all user guilds for DM reachability', () => {
    expect(resolveListGuildCandidates(guilds, true).map((g) => g.id)).toEqual(['1', '2']);
  });

  it('prefers manageable guilds for publish target listing', () => {
    expect(resolveListGuildCandidates(guilds, false).map((g) => g.id)).toEqual(['1']);
  });

  it('falls back to all guilds when user cannot manage any server', () => {
    const memberOnly = guilds.filter((g) => g.permissions === MEMBER_ONLY);
    expect(resolveListGuildCandidates(memberOnly, false).map((g) => g.id)).toEqual(['2']);
  });

  it('treats guild owner as manageable even without permission bits', () => {
    const owned = [{id: '3', name: 'Owned', icon: null, owner: true, permissions: '0'}];
    expect(resolveListGuildCandidates(owned, false).map((g) => g.id)).toEqual(['3']);
  });
});
