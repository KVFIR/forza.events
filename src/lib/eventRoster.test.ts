import {describe, expect, it} from 'vitest';
import {resolveResultsRoster} from './eventRoster';
import type {ForzaEvent} from './types';

function event(
  partial: Partial<ForzaEvent> & Pick<ForzaEvent, 'hostDiscordId'>,
): ForzaEvent {
  return {
    id: '1',
    slug: 'e',
    title: 'Race',
    type: 'road',
    status: 'open',
    lifecycle: 'open',
    startsAt: new Date().toISOString(),
    carRuleMode: 'anything_goes',
    maxPi: 999,
    allowedCars: [],
    voicePolicy: 'optional',
    maxPlayers: 12,
    currentPlayers: 1,
    hostUsername: 'Host',
    rules: '',
    participants: [],
    lobbyLeaderGamertag: 'HostGT',
    lobbyLeaderIsHost: true,
    ...partial,
  };
}

describe('resolveResultsRoster', () => {
  it('includes host convoy leader when there are no joins', () => {
    const roster = resolveResultsRoster(event({hostDiscordId: 'host-1'}), 'host-1', 'HostGT');
    expect(roster).toHaveLength(1);
    expect(roster[0]?.discordId).toBe('host-1');
  });

  it('merges joiners with host leader without duplicate', () => {
    const roster = resolveResultsRoster(
      event({
        hostDiscordId: 'host-1',
        participants: [
          {discordId: 'host-1', username: 'Host', gamertag: 'HostGT'},
          {discordId: 'p2', username: 'B', gamertag: 'BGT'},
        ],
      }),
      'host-1',
    );
    expect(roster.map((p) => p.discordId)).toEqual(['host-1', 'p2']);
  });

  it('includes external convoy leader by discord id without join', () => {
    const roster = resolveResultsRoster(
      event({
        hostDiscordId: 'host-1',
        lobbyLeaderIsHost: false,
        lobbyLeaderDiscordId: 'leader-9',
        lobbyLeaderGamertag: 'LeaderGT',
        participants: [],
      }),
      'host-1',
    );
    expect(roster).toHaveLength(1);
    expect(roster[0]?.discordId).toBe('leader-9');
  });

  it('uses joiners only when convoy leader is not the host', () => {
    const roster = resolveResultsRoster(
      event({
        hostDiscordId: 'host-1',
        lobbyLeaderIsHost: false,
        lobbyLeaderGamertag: 'OtherGT',
        participants: [{discordId: 'p2', username: 'B', gamertag: 'OtherGT'}],
      }),
      'host-1',
    );
    expect(roster.map((p) => p.discordId)).toEqual(['p2']);
  });
});
