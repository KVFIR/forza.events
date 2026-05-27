import {describe, expect, it} from 'vitest';
import {
  resolveConvoyLeader,
  resolveRegisteredDrivers,
  resolveResultsRoster,
} from './eventRoster';
import type {EventParticipant, ForzaEvent} from './types';

function participant(
  partial: Partial<EventParticipant> & Pick<EventParticipant, 'discordId'>,
): EventParticipant {
  return {
    username: partial.username ?? 'Driver',
    gamertag: partial.gamertag ?? 'GT',
    isConvoyLeader: false,
    participationSource: 'self_join',
    ...partial,
  };
}

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
    currentPlayers: 2,
    hostUsername: 'Host',
    rules: '',
    participants: [],
    ...partial,
  };
}

describe('resolveConvoyLeader', () => {
  it('falls back to denormalized event fields when participant row is missing', () => {
    const ev = event({
      hostDiscordId: 'host-1',
      lobbyLeaderGamertag: 'HostGT',
      lobbyLeaderDiscordId: 'host-1',
      lobbyLeaderIsHost: true,
      participants: [],
      currentPlayers: 0,
    });
    const convoy = resolveConvoyLeader(ev, 'host-1');
    expect(convoy?.gamertag).toBe('HostGT');
    expect(convoy?.isYou).toBe(true);
    expect(convoy?.participationSource).toBe('host_self_assigned');
  });

  it('reads leader from participant role', () => {
    const ev = event({
      hostDiscordId: 'host-1',
      participants: [
        participant({
          discordId: 'host-1',
          gamertag: 'HostGT',
          isConvoyLeader: true,
          participationSource: 'host_self_assigned',
        }),
        participant({discordId: 'p2', gamertag: 'BGT'}),
      ],
    });
    const convoy = resolveConvoyLeader(ev, 'host-1');
    expect(convoy?.discordId).toBe('host-1');
    expect(convoy?.gamertag).toBe('HostGT');
  });
});

describe('resolveRegisteredDrivers', () => {
  it('excludes convoy leader from driver grid', () => {
    const participants = [
      participant({
        discordId: 'leader-9',
        gamertag: 'LeaderGT',
        isConvoyLeader: true,
        participationSource: 'host_assigned',
      }),
      participant({discordId: 'p2', gamertag: 'BGT'}),
    ];
    expect(resolveRegisteredDrivers(participants).map((p) => p.discordId)).toEqual(['p2']);
  });
});

describe('resolveResultsRoster', () => {
  it('returns all participants once', () => {
    const participants = [
      participant({
        discordId: 'host-1',
        gamertag: 'HostGT',
        isConvoyLeader: true,
        participationSource: 'host_self_assigned',
      }),
      participant({discordId: 'p2', gamertag: 'BGT'}),
    ];
    const roster = resolveResultsRoster(event({hostDiscordId: 'host-1', participants}));
    expect(roster.map((p) => p.discordId)).toEqual(['host-1', 'p2']);
  });

  it('includes non-host leader assigned before self join', () => {
    const participants = [
      participant({
        discordId: 'leader-9',
        gamertag: 'LeaderGT',
        isConvoyLeader: true,
        participationSource: 'host_assigned',
      }),
      participant({discordId: 'p2', gamertag: 'BGT'}),
    ];
    const roster = resolveResultsRoster(event({hostDiscordId: 'host-1', participants}));
    expect(roster.map((p) => p.discordId)).toEqual(['leader-9', 'p2']);
  });
});
