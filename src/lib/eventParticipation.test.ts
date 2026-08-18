import {describe, expect, it} from 'vitest';
import {resolveEventGroups} from './eventRoster';
import {
  applyJoinServerResponse,
  mergeOptimisticEventPatch,
  patchEventAfterSelfJoin,
  patchEventAfterSelfLeave,
} from './eventParticipation';
import type {ForzaEvent} from './types';

const user = {discordId: 'u1', username: 'Alice', avatarUrl: 'https://a.test/a.png'};

const base = {
  id: 'e1',
  slug: 'e1',
  title: 'Test',
  type: 'road' as const,
    game: 'fh6',
  status: 'open' as const,
  lifecycle: 'open' as const,
  startsAt: new Date().toISOString(),
  maxPlayers: 12,
  currentPlayers: 3,
  hostDiscordId: 'host',
  participants: [
    {discordId: 'u1', username: 'A', gamertag: 'GT1', participationSource: 'self_join' as const},
    {discordId: 'u2', username: 'B', gamertag: 'GT2', participationSource: 'self_join' as const},
  ],
} satisfies Partial<ForzaEvent> as ForzaEvent;

describe('patchEventAfterSelfLeave', () => {
  it('removes the user and decrements lobby count', () => {
    const next = patchEventAfterSelfLeave(base, 'u1');
    expect(next.participants).toHaveLength(1);
    expect(next.participants[0]?.discordId).toBe('u2');
    expect(next.currentPlayers).toBe(2);
  });

  it('returns the same object when user is not registered', () => {
    const next = patchEventAfterSelfLeave(base, 'unknown');
    expect(next).toBe(base);
  });

  it('removes host_assigned row and decrements lobby count', () => {
    const assigned = {
      ...base,
      currentPlayers: 2,
      participants: [
        {
          discordId: 'u1',
          username: 'A',
          gamertag: 'GT1',
          participationSource: 'host_assigned' as const,
          isConvoyLeader: true,
        },
        {discordId: 'u2', username: 'B', gamertag: 'GT2', participationSource: 'self_join' as const},
      ],
    };
    const next = patchEventAfterSelfLeave(assigned, 'u1');
    expect(next.participants.map((p) => p.discordId)).toEqual(['u2']);
    expect(next.currentPlayers).toBe(1);
  });

  it('removes host_self_assigned row and decrements lobby count', () => {
    const hostLeader = {
      ...base,
      currentPlayers: 1,
      participants: [
        {
          discordId: 'host',
          username: 'Host',
          gamertag: 'HostGT',
          participationSource: 'host_self_assigned' as const,
          isConvoyLeader: true,
        },
      ],
    };
    const next = patchEventAfterSelfLeave(hostLeader, 'host');
    expect(next.participants).toHaveLength(0);
    expect(next.currentPlayers).toBe(0);
  });

  it('removes row without participationSource and decrements lobby count', () => {
    const legacy = {
      ...base,
      currentPlayers: 2,
      participants: [
        {discordId: 'u1', username: 'A', gamertag: 'GT1'},
        {discordId: 'u2', username: 'B', gamertag: 'GT2', participationSource: 'self_join' as const},
      ],
    };
    const next = patchEventAfterSelfLeave(legacy, 'u1');
    expect(next.participants).toHaveLength(1);
    expect(next.currentPlayers).toBe(1);
  });

  it('promotes the earliest waitlisted racer when an active seat opens', () => {
    const ev = {
      ...base,
      currentPlayers: 12,
      participants: [
        ...Array.from({length: 11}, (_, i) => ({
          discordId: `a${i}`,
          username: 'A',
          gamertag: `GT${i}`,
          participationSource: 'self_join' as const,
          groupIndex: 1,
        })),
        {
          discordId: 'u1',
          username: 'A',
          gamertag: 'GT1',
          participationSource: 'self_join' as const,
          groupIndex: 1,
        },
        {
          discordId: 'q2',
          username: 'Q2',
          gamertag: 'Q2',
          participationSource: 'self_join' as const,
          waitlisted: true,
          joinedAt: '2030-02-01T00:00:00Z',
        },
        {
          discordId: 'q1',
          username: 'Q1',
          gamertag: 'Q1',
          participationSource: 'self_join' as const,
          waitlisted: true,
          joinedAt: '2030-01-01T00:00:00Z',
        },
      ],
    };
    const next = patchEventAfterSelfLeave(ev, 'u1');
    const promoted = next.participants.find((p) => p.discordId === 'q1');
    expect(promoted?.waitlisted).toBe(false);
    expect(promoted?.groupIndex).toBe(1);
    expect(next.currentPlayers).toBe(12);
  });

  it('leaving the waitlist does not promote anyone', () => {
    const ev = {
      ...base,
      currentPlayers: 12,
      participants: [
        {discordId: 'u1', username: 'A', gamertag: 'GT1', participationSource: 'self_join' as const, waitlisted: true},
        {discordId: 'q1', username: 'Q1', gamertag: 'Q1', participationSource: 'self_join' as const, waitlisted: true},
      ],
    };
    const next = patchEventAfterSelfLeave(ev, 'u1');
    expect(next.participants).toHaveLength(1);
    expect(next.currentPlayers).toBe(12);
  });
});

describe('patchEventAfterSelfJoin', () => {
  it('adds a new self_join row and increments lobby count', () => {
    const empty = {...base, currentPlayers: 0, participants: []};
    const next = patchEventAfterSelfJoin(empty, user, 'NewGT');
    expect(next.participants).toHaveLength(1);
    expect(next.participants[0]).toMatchObject({
      discordId: 'u1',
      gamertag: 'NewGT',
      participationSource: 'self_join',
    });
    expect(next.currentPlayers).toBe(1);
  });

  it('is idempotent when already self_joined', () => {
    const next = patchEventAfterSelfJoin(base, user, 'GT1');
    expect(next).toBe(base);
  });

  it('updates gamertag without incrementing when host_assigned row exists', () => {
    const assigned = {
      ...base,
      currentPlayers: 2,
      participants: [
        {
          discordId: 'u1',
          username: 'A',
          gamertag: 'Old',
          participationSource: 'host_assigned' as const,
          isConvoyLeader: true,
          rating: 1514,
        },
        {discordId: 'u2', username: 'B', gamertag: 'GT2', participationSource: 'self_join' as const},
      ],
    };
    const next = patchEventAfterSelfJoin(assigned, user, 'NewGT');
    expect(next.currentPlayers).toBe(2);
    expect(next.participants[0]?.gamertag).toBe('NewGT');
    expect(next.participants[0]?.participationSource).toBe('host_assigned');
    expect(next.participants[0]?.rating).toBe(1514);
  });

  it('does not exceed maxPlayers when incrementing', () => {
    const full = {...base, currentPlayers: 12, maxPlayers: 12, participants: []};
    const next = patchEventAfterSelfJoin(full, user, 'GT');
    expect(next.currentPlayers).toBe(12);
    expect(next.participants[0]?.waitlisted).toBe(true);
  });

  it('waitlists when currentPlayers is full but participants list is empty', () => {
    const full = {...base, currentPlayers: 12, maxPlayers: 12, groupCount: 1, participants: []};
    const next = patchEventAfterSelfJoin(full, user, 'GT');
    expect(next.participants[0]?.waitlisted).toBe(true);
    expect(next.currentPlayers).toBe(12);
  });

  it('sets joinedAt so optimistic roster order is last among drivers', () => {
    const joiner = {discordId: 'u3', username: 'C', avatarUrl: 'https://a.test/c.png'};
    const ev = {
      ...base,
      currentPlayers: 2,
      participants: [
        {
          discordId: 'leader',
          username: 'L',
          gamertag: 'LGT',
          isConvoyLeader: true,
          participationSource: 'host_assigned' as const,
          groupIndex: 1,
          joinedAt: '2020-01-01T00:00:00Z',
        },
        {
          discordId: 'u2',
          username: 'B',
          gamertag: 'GT2',
          participationSource: 'self_join' as const,
          groupIndex: 1,
          joinedAt: '2020-01-02T00:00:00Z',
        },
      ],
    };
    const next = patchEventAfterSelfJoin(ev, joiner, 'NewGT');
    const joined = next.participants.find((p) => p.discordId === 'u3');
    expect(joined?.joinedAt).toBeTruthy();
    const groups = resolveEventGroups(
      {
        ...next,
        groupCount: 1,
        hostDiscordId: 'leader',
        hostUsername: 'L',
        lobbyLeaderGamertag: 'LGT',
        lobbyLeaderDiscordId: 'leader',
      },
      'u3',
    );
    expect(groups[0]?.drivers.map((p) => p.discordId)).toEqual(['u2', 'u3']);
  });
});

describe('applyJoinServerResponse', () => {
  it('reconciles waitlist and group from the server', () => {
    const optimistic = patchEventAfterSelfJoin(
      {...base, currentPlayers: 12, maxPlayers: 12, participants: []},
      user,
      'GT',
    );
    const refined = applyJoinServerResponse(optimistic, 'u1', {
      joined: false,
      waitlisted: true,
      group_index: 1,
    });
    expect(refined.participants[0]?.waitlisted).toBe(true);
    expect(refined.participants[0]?.groupIndex).toBe(1);
  });
});

describe('mergeOptimisticEventPatch', () => {
  it('returns the event unchanged when patch is undefined', () => {
    expect(mergeOptimisticEventPatch(base, undefined)).toBe(base);
  });

  it('overrides lobby fields from the patch', () => {
    const patched = patchEventAfterSelfLeave(base, 'u1');
    const merged = mergeOptimisticEventPatch(base, {
      currentPlayers: patched.currentPlayers,
      participants: patched.participants,
    });
    expect(merged.currentPlayers).toBe(2);
    expect(merged.participants).toHaveLength(1);
  });
});
