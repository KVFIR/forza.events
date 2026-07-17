import {describe, expect, it} from 'vitest';
import {
  MAX_GROUPS,
  canAddGroup,
  firstOpenGroupIndex,
  groupIsFull,
  groupRosterCanShuffle,
  groupRosterNeedsBalance,
  lobbyIsFull,
  totalCapacity,
  waitlistCount,
} from './eventSpec';
import type {AppUser, EventParticipant, ForzaEvent} from './types';

function participant(
  partial: Partial<EventParticipant> & Pick<EventParticipant, 'discordId'>,
): EventParticipant {
  return {
    username: 'Driver',
    gamertag: 'GT',
    isConvoyLeader: false,
    participationSource: 'self_join',
    groupIndex: 1,
    waitlisted: false,
    ...partial,
  };
}

function event(partial: Partial<ForzaEvent> = {}): ForzaEvent {
  return {
    id: '1',
    slug: 'e',
    title: 'Race',
    type: 'road',
    status: 'open',
    lifecycle: 'open',
    startsAt: new Date(Date.now() + 86_400_000).toISOString(),
    carRuleMode: 'anything_goes',
    maxPi: 999,
    allowedCars: [],
    voicePolicy: 'optional',
    maxPlayers: 12,
    groupCount: 1,
    currentPlayers: 0,
    hostDiscordId: 'host-1',
    hostUsername: 'Host',
    rules: '',
    discordMessageId: 'msg-1',
    participants: [],
    ...partial,
  };
}

function fill(count: number, groupIndex: number, waitlisted = false): EventParticipant[] {
  return Array.from({length: count}, (_, i) =>
    participant({discordId: `${groupIndex}-${waitlisted ? 'w' : 'a'}-${i}`, groupIndex, waitlisted}),
  );
}

const host: AppUser = {
  discordId: 'host-1',
  username: 'host',
  eventsJoined: 0,
  eventsHosted: 0,
  attendanceRate: 0,
  noShows: 0,
  hostRatingAvg: 0,
};

describe('totalCapacity', () => {
  it('scales with group count', () => {
    expect(totalCapacity(event({groupCount: 1}))).toBe(12);
    expect(totalCapacity(event({groupCount: 3}))).toBe(36);
    expect(totalCapacity(event({groupCount: MAX_GROUPS}))).toBe(60);
  });
});

describe('group fullness / routing', () => {
  it('reports a group full only once it reaches maxPlayers', () => {
    const ev = event({participants: fill(11, 1)});
    expect(groupIsFull(ev, 1, ev.participants)).toBe(false);
    expect(firstOpenGroupIndex(ev)).toBe(1);

    const full = event({groupCount: 1, participants: fill(12, 1)});
    expect(groupIsFull(full, 1, full.participants)).toBe(true);
    expect(firstOpenGroupIndex(full)).toBeNull();
    expect(lobbyIsFull(full)).toBe(true);
  });

  it('routes to the smallest open group across multiple groups', () => {
    const ev = event({
      groupCount: 2,
      participants: [...fill(12, 1), ...fill(3, 2)],
    });
    expect(firstOpenGroupIndex(ev)).toBe(2);

    const uneven = event({
      groupCount: 2,
      participants: [...fill(8, 1), ...fill(5, 2)],
    });
    expect(firstOpenGroupIndex(uneven)).toBe(2);
  });

  it('lobbyIsFull when currentPlayers reaches total capacity even if participants is stale', () => {
    const ev = event({groupCount: 2, currentPlayers: 24, participants: []});
    expect(lobbyIsFull(ev)).toBe(true);
  });
});

describe('canAddGroup', () => {
  const fullGroup = fill(12, 1);

  it('is allowed for host when every active group is full', () => {
    const ev = event({participants: fullGroup, currentPlayers: 12});
    expect(canAddGroup(ev, host)).toBe(true);
  });

  it('is allowed for host of a full lobby with a waitlist', () => {
    const ev = event({participants: [...fullGroup, ...fill(1, 1, true)], currentPlayers: 12});
    expect(waitlistCount(ev)).toBe(1);
    expect(canAddGroup(ev, host)).toBe(true);
  });

  it('is blocked when active groups still have open seats', () => {
    const ev = event({
      participants: [
        ...fill(11, 1),
        participant({discordId: 'q1', waitlisted: true}),
      ],
      currentPlayers: 11,
    });
    expect(canAddGroup(ev, host)).toBe(false);
  });

  it('is blocked once MAX_GROUPS is reached', () => {
    const ev = event({
      groupCount: MAX_GROUPS,
      participants: [...fill(1, 1, true)],
    });
    expect(canAddGroup(ev, host)).toBe(false);
  });

  it('is blocked for non-hosts', () => {
    const ev = event({participants: [...fullGroup, ...fill(1, 1, true)]});
    expect(canAddGroup(ev, {...host, discordId: 'someone-else'})).toBe(false);
  });
});

describe('group roster helpers', () => {
  it('detects uneven group sizes', () => {
    const uneven = event({
      groupCount: 2,
      participants: [
        participant({discordId: 'l1', isConvoyLeader: true, groupIndex: 1}),
        participant({discordId: 'l2', isConvoyLeader: true, groupIndex: 2}),
        ...fill(3, 1),
        ...fill(1, 2),
      ],
    });
    expect(groupRosterNeedsBalance(uneven)).toBe(true);

    const even = event({
      groupCount: 2,
      participants: [
        participant({discordId: 'l1', isConvoyLeader: true, groupIndex: 1}),
        participant({discordId: 'l2', isConvoyLeader: true, groupIndex: 2}),
        participant({discordId: 'a', groupIndex: 1}),
        participant({discordId: 'b', groupIndex: 2}),
      ],
    });
    expect(groupRosterNeedsBalance(even)).toBe(false);
  });

  it('requires two drivers before shuffle is offered', () => {
    const oneDriver = event({
      groupCount: 2,
      participants: [
        participant({discordId: 'l1', isConvoyLeader: true, groupIndex: 1}),
        participant({discordId: 'l2', isConvoyLeader: true, groupIndex: 2}),
        participant({discordId: 'a', groupIndex: 1}),
      ],
    });
    expect(groupRosterCanShuffle(oneDriver)).toBe(false);
    expect(groupRosterCanShuffle({
      ...oneDriver,
      participants: [...oneDriver.participants, participant({discordId: 'b', groupIndex: 2})],
    })).toBe(true);
  });
});
