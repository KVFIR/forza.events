import {describe, expect, it} from 'vitest';
import {groupRosterCanShuffle} from './eventSpec';
import {groupRosterWouldChange, planGroupRosterMoves} from './groupRoster';
import type {ForzaEvent} from './types';

function participant(
  partial: Partial<ForzaEvent['participants'][number]> &
    Pick<ForzaEvent['participants'][number], 'discordId'>,
) {
  return {
    username: 'x',
    gamertag: 'GT',
    isConvoyLeader: false,
    participationSource: 'self_join' as const,
    groupIndex: 1,
    waitlisted: false,
    ...partial,
  };
}

function event(partial: Partial<ForzaEvent>): ForzaEvent {
  return {
    id: 'e1',
    slug: 'e1',
    title: 'T',
    type: 'road',
    game: 'fh6',
    status: 'open',
    hostDiscordId: 'host',
    maxPlayers: 12,
    groupCount: 2,
    participants: [],
    ...partial,
  } as ForzaEvent;
}

describe('groupRosterWouldChange', () => {
  it('offers balance only when sizes are uneven', () => {
    const uneven = event({
      participants: [
        participant({discordId: 'l1', isConvoyLeader: true, groupIndex: 1}),
        participant({discordId: 'l2', isConvoyLeader: true, groupIndex: 2}),
        participant({discordId: 'a', groupIndex: 1}),
        participant({discordId: 'b', groupIndex: 1}),
        participant({discordId: 'c', groupIndex: 1}),
        participant({discordId: 'd', groupIndex: 2}),
      ],
    });
    expect(groupRosterWouldChange(uneven, 'balance')).toBe(true);
    expect(groupRosterCanShuffle(uneven)).toBe(true);
  });

  it('offers shuffle but not balance when sizes are even', () => {
    const even = event({
      participants: [
        participant({discordId: 'l1', isConvoyLeader: true, groupIndex: 1}),
        participant({discordId: 'l2', isConvoyLeader: true, groupIndex: 2}),
        participant({discordId: 'a', groupIndex: 1}),
        participant({discordId: 'b', groupIndex: 2}),
      ],
    });
    expect(groupRosterWouldChange(even, 'balance')).toBe(false);
    expect(groupRosterCanShuffle(even)).toBe(true);
  });

  it('offers nothing with fewer than two drivers', () => {
    const oneDriver = event({
      participants: [
        participant({discordId: 'l1', isConvoyLeader: true, groupIndex: 1}),
        participant({discordId: 'l2', isConvoyLeader: true, groupIndex: 2}),
        participant({discordId: 'a', groupIndex: 1}),
      ],
    });
    expect(groupRosterWouldChange(oneDriver, 'balance')).toBe(false);
    expect(groupRosterCanShuffle(oneDriver)).toBe(false);
    expect(planGroupRosterMoves(oneDriver, 'shuffle')).toEqual([]);
  });
});
