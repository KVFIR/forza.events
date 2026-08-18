import {describe, expect, it} from 'vitest';
import {isDiscordLinkUrl, parseGuildInviteUrl} from '../src/lib/guildDisplay';
import {EVENT_DETAIL_SELECT, EVENT_LIST_SELECT} from '../src/lib/events';
import {
  EVENT_DETAIL_SELECT as EDGE_EVENT_DETAIL_SELECT,
  EVENT_LIST_SELECT as EDGE_EVENT_LIST_SELECT,
} from '@edge/eventListSelect.ts';

describe('parseGuildInviteUrl', () => {
  it('reads invite_url from guild settings', () => {
    expect(parseGuildInviteUrl({invite_url: 'https://discord.gg/test'})).toBe(
      'https://discord.gg/test',
    );
  });

  it('rejects non-Discord URLs', () => {
    expect(parseGuildInviteUrl({invite_url: 'https://evil.example/phish'})).toBeUndefined();
  });

  it('returns undefined for missing or invalid settings', () => {
    expect(parseGuildInviteUrl(null)).toBeUndefined();
    expect(parseGuildInviteUrl({invite_url: '  '})).toBeUndefined();
  });
});

describe('isDiscordLinkUrl', () => {
  it('allows Discord OAuth and invite hosts', () => {
    expect(isDiscordLinkUrl('https://discord.com/oauth2/authorize')).toBe(true);
    expect(isDiscordLinkUrl('https://discord.gg/abc')).toBe(true);
  });

  it('rejects http and unknown hosts', () => {
    expect(isDiscordLinkUrl('http://discord.gg/abc')).toBe(false);
    expect(isDiscordLinkUrl('https://example.com')).toBe(false);
  });
});

describe('EVENT_LIST_SELECT parity', () => {
  it('client and Edge selects match', () => {
    expect(EDGE_EVENT_LIST_SELECT.replace(/\s+/g, ' ').trim()).toBe(
      EVENT_LIST_SELECT.replace(/\s+/g, ' ').trim(),
    );
  });

  it('client and Edge detail selects match', () => {
    expect(EDGE_EVENT_DETAIL_SELECT.replace(/\s+/g, ' ').trim()).toBe(
      EVENT_DETAIL_SELECT.replace(/\s+/g, ' ').trim(),
    );
  });

  it('loads roster ratings only on detail', () => {
    expect(EVENT_LIST_SELECT).not.toContain('player_ratings');
    expect(EVENT_DETAIL_SELECT).toContain('player_ratings');
  });
});
