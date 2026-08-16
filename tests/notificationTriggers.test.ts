import {describe, expect, it} from 'vitest';
import {
  eventUpdateRecipients,
  summarizeCarsForNotify,
  voiceJoinUrlFromEvent,
} from '../supabase/functions/_shared/notificationTriggers.ts';

describe('summarizeCarsForNotify', () => {
  it('returns null for open build without PI cap or notes', () => {
    expect(summarizeCarsForNotify('anything_goes', null, null, 0, 'en')).toBeNull();
  });

  it('summarizes PI cap only', () => {
    expect(summarizeCarsForNotify('anything_goes', 650, null, 0, 'en')).toBe('PI cap 650');
  });

  it('summarizes notes only', () => {
    expect(summarizeCarsForNotify('anything_goes', null, 'No swap', 0, 'ru')).toBe('No swap');
  });

  it('still summarizes restricted list updates', () => {
    expect(summarizeCarsForNotify('restricted_list', null, null, 3, 'en')).toBe(
      'Restricted list updated (3 cars)',
    );
  });
});

describe('eventUpdateRecipients', () => {
  const roster = [
    {discord_id: 'a', waitlisted: false},
    {discord_id: 'b', waitlisted: true},
  ];

  it('notifies active racers only for tracks/cars edits', () => {
    expect(eventUpdateRecipients(roster, false).map((r) => r.discord_id)).toEqual(['a']);
  });

  it('includes waitlist when schedule changes', () => {
    expect(eventUpdateRecipients(roster, true).map((r) => r.discord_id)).toEqual(['a', 'b']);
  });
});

describe('voiceJoinUrlFromEvent', () => {
  it('prefers a stored invite over the channel URL', () => {
    expect(
      voiceJoinUrlFromEvent({
        guild_id: 'g1',
        voice_channel_id: 'vc1',
        voice_invite_url: 'https://discord.gg/abc',
      }),
    ).toBe('https://discord.gg/abc');
  });

  it('ignores a non-Discord invite and falls back to the channel URL', () => {
    expect(
      voiceJoinUrlFromEvent({
        guild_id: 'g1',
        voice_channel_id: 'vc1',
        voice_invite_url: 'https://example.com/not-discord',
      }),
    ).toBe('https://discord.com/channels/g1/vc1');
  });

  it('falls back to the Discord channel URL', () => {
    expect(
      voiceJoinUrlFromEvent({
        guild_id: 'g1',
        voice_channel_id: 'vc1',
        voice_invite_url: null,
      }),
    ).toBe('https://discord.com/channels/g1/vc1');
  });

  it('is undefined when voice is unset', () => {
    expect(voiceJoinUrlFromEvent({guild_id: 'g1'})).toBeUndefined();
  });
});
