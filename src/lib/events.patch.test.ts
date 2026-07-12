import {describe, expect, it} from 'vitest';
import {patchEventLobby} from './events';
import type {ForzaEvent} from './types';

const baseEvent = {
  id: 'e1',
  slug: 'e1',
  title: 'Race',
  type: 'road' as const,
  status: 'open' as const,
  lifecycle: 'open' as const,
  startsAt: '2099-06-01T12:00:00.000Z',
  voicePolicy: 'optional' as const,
  maxPlayers: 12,
  currentPlayers: 2,
  hostDiscordId: 'host',
  hostUsername: 'host',
  carRuleMode: 'anything_goes' as const,
  maxPi: 800,
  allowedCars: [],
  rules: '',
  participants: [],
};

describe('patchEventLobby', () => {
  it('marks full when lobby fills', () => {
    const patched = patchEventLobby(baseEvent as ForzaEvent, {
      current_players: 12,
      max_players: 12,
      status: 'open',
    });
    expect(patched.currentPlayers).toBe(12);
    expect(patched.status).toBe('full');
  });

  it('marks live when lifecycle is live', () => {
    const patched = patchEventLobby(baseEvent as ForzaEvent, {
      current_players: 4,
      max_players: 12,
      status: 'live',
    });
    expect(patched.lifecycle).toBe('live');
    expect(patched.status).toBe('live');
  });

  it('updates group count from realtime patches', () => {
    const patched = patchEventLobby({...baseEvent, groupCount: 1} as ForzaEvent, {
      current_players: 12,
      max_players: 12,
      group_count: 2,
      status: 'open',
    });
    expect(patched.groupCount).toBe(2);
    expect(patched.status).toBe('open');
  });
});
