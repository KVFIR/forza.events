import {describe, expect, it} from 'vitest';
import {
  buildNotificationEmbed,
  isKnownNotificationKind,
} from '../supabase/functions/_shared/notificationCopy.ts';

describe('isKnownNotificationKind', () => {
  it('accepts active kinds', () => {
    expect(isKnownNotificationKind('host_group_filled')).toBe(true);
    expect(isKnownNotificationKind('waitlist_seat_opened')).toBe(true);
    expect(isKnownNotificationKind('group_reassigned')).toBe(true);
    expect(isKnownNotificationKind('event_now_ranked')).toBe(true);
    expect(isKnownNotificationKind('event_published')).toBe(true);
  });

  it('rejects removed or unknown kinds', () => {
    expect(isKnownNotificationKind('host_lobby_full')).toBe(false);
    expect(isKnownNotificationKind('not_a_kind')).toBe(false);
  });
});

describe('2h reminder voice field', () => {
  const soon = {
    eventTitle: 'Night',
    startsAtLocal: 'Aug 16, 22:00',
    timezone: 'UTC',
    groupIndex: 1,
    leaderGamertag: 'Host',
  };

  it('adds a Join voice link for racers when voiceJoinUrl is set', () => {
    const embed = buildNotificationEmbed('event_starting_soon', 'en', {
      ...soon,
      voiceJoinUrl: 'https://discord.gg/abc',
    });
    expect(embed.fields).toEqual(
      expect.arrayContaining([
        {name: 'Voice', value: '[Join voice](https://discord.gg/abc)'},
      ]),
    );
  });

  it('uses the channel mention as the link label when named', () => {
    const embed = buildNotificationEmbed('event_starting_soon', 'en', {
      ...soon,
      voiceJoinUrl: 'https://discord.gg/abc',
      voiceChannelName: 'Gathering',
    });
    expect(embed.fields).toEqual(
      expect.arrayContaining([
        {name: 'Voice', value: '[#Gathering](https://discord.gg/abc)'},
      ]),
    );
  });

  it('omits Voice when no URL is set', () => {
    const embed = buildNotificationEmbed('event_starting_soon', 'en', soon);
    expect(embed.fields?.some((f) => f.name === 'Voice')).toBe(false);
  });

  it('adds a Russian Join voice link on the host reminder', () => {
    const embed = buildNotificationEmbed('host_event_starting_soon', 'ru', {
      eventTitle: 'Night',
      startsAtLocal: '16 авг., 22:00',
      activeCount: 4,
      totalCapacity: 12,
      waitlistCount: 0,
      voiceJoinUrl: 'https://discord.gg/abc',
    });
    expect(embed.fields).toEqual(
      expect.arrayContaining([
        {name: 'Голос', value: '[Зайти в голосовой](https://discord.gg/abc)'},
      ]),
    );
  });
});
