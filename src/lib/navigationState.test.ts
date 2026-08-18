import {describe, expect, it} from 'vitest';
import {
  buildEventDetailLocationState,
  buildEventDetailNavigateStateAfterSubmit,
  eventDetailRouteSeed,
} from './navigationState';
import type {ForzaEvent} from './types';

function event(id: string): ForzaEvent {
  return {
    id,
    slug: 'race',
    title: 'Race',
    type: 'road',
    game: 'fh6',
    status: 'ended',
    lifecycle: 'completed',
    startsAt: new Date().toISOString(),
    carRuleMode: 'anything_goes',
    maxPi: 999,
    allowedCars: [],
    voicePolicy: 'optional',
    maxPlayers: 12,
    currentPlayers: 1,
    hostDiscordId: 'host',
    hostUsername: 'host',
    rules: '',
    participants: [],
  };
}

describe('eventDetailRouteSeed', () => {
  it('returns null when event id mismatches', () => {
    expect(eventDetailRouteSeed({event: event('a')}, 'b')).toBeNull();
  });

  it('matches a navigation seed by slug', () => {
    expect(eventDetailRouteSeed({event: event('a')}, 'race')?.event.id).toBe('a');
  });

  it('includes empty resultRows when explicitly seeded', () => {
    const seed = eventDetailRouteSeed(
      {event: event('ev-1'), resultRows: []},
      'ev-1',
    );
    expect(seed?.resultRows).toEqual([]);
  });

  it('omits resultRows when not in navigation state', () => {
    const seed = eventDetailRouteSeed({event: event('ev-1')}, 'ev-1');
    expect(seed?.resultRows).toBeUndefined();
  });
});

describe('buildEventDetailLocationState', () => {
  it('drops unsafe from values', () => {
    expect(buildEventDetailLocationState({from: '/evil/path'}, '/my-events')).toEqual({
      from: '/my-events',
    });
    expect(buildEventDetailLocationState({from: '/foo/bar'})).toEqual({});
  });
});

describe('buildEventDetailNavigateStateAfterSubmit', () => {
  it('omits resultRows when PostgREST read failed', () => {
    const ev = event('ev-1');
    expect(
      buildEventDetailNavigateStateAfterSubmit(ev, {rows: [], error: 'fetch_failed'}),
    ).toEqual({event: ev});
  });

  it('includes resultRows on successful read', () => {
    const ev = event('ev-1');
    const rows = [{discordId: 'a', position: 1, dnf: false, dns: false}];
    expect(
      buildEventDetailNavigateStateAfterSubmit(ev, {rows, error: null}),
    ).toEqual({event: ev, resultRows: rows});
  });

  it('preserves from referrer after submit', () => {
    const ev = event('ev-1');
    expect(
      buildEventDetailNavigateStateAfterSubmit(ev, {rows: [], error: null}, '/my-events'),
    ).toEqual({event: ev, resultRows: [], from: '/my-events'});
  });
});
