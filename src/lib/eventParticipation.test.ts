import {describe, expect, it} from 'vitest';
import {patchEventAfterSelfLeave} from './eventParticipation';
import type {ForzaEvent} from './types';

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
    {discordId: 'u1', username: 'A', gamertag: 'GT1'},
    {discordId: 'u2', username: 'B', gamertag: 'GT2'},
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
});
