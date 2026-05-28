import {describe, expect, it} from 'vitest';
import {
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
        },
        {discordId: 'u2', username: 'B', gamertag: 'GT2', participationSource: 'self_join' as const},
      ],
    };
    const next = patchEventAfterSelfJoin(assigned, user, 'NewGT');
    expect(next.currentPlayers).toBe(2);
    expect(next.participants[0]?.gamertag).toBe('NewGT');
    expect(next.participants[0]?.participationSource).toBe('host_assigned');
  });

  it('does not exceed maxPlayers when incrementing', () => {
    const full = {...base, currentPlayers: 12, maxPlayers: 12, participants: []};
    const next = patchEventAfterSelfJoin(full, user, 'GT');
    expect(next.currentPlayers).toBe(12);
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
