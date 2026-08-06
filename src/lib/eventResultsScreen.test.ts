import {describe, expect, it} from 'vitest';
import {savedCountFromResultsFetch, shouldLeaveResultsScreen} from './eventResultsScreen';
import type {AppUser, ForzaEvent} from './types';

function event(partial: Partial<ForzaEvent>): ForzaEvent {
  return {
    id: 'ev-1',
    slug: 'race',
    title: 'Race',
    type: 'road',
    game: 'fh6',
    status: 'live',
    lifecycle: 'open',
    startsAt: new Date(Date.now() - 60_000).toISOString(),
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
    ...partial,
  };
}

const profileDefaults = {
  eventsJoined: 0,
  eventsHosted: 0,
  attendanceRate: 0,
  noShows: 0,
  hostRatingAvg: 0,
};

const host: AppUser = {
  discordId: 'host',
  username: 'host',
  xboxGamertag: 'HostTag',
  ...profileDefaults,
};

const guest: AppUser = {
  discordId: 'guest',
  username: 'guest',
  xboxGamertag: 'GuestTag',
  ...profileDefaults,
};

describe('savedCountFromResultsFetch', () => {
  it('returns null when fetch failed', () => {
    expect(savedCountFromResultsFetch({rows: [], error: 'fetch_failed'})).toBeNull();
  });

  it('returns row count on success', () => {
    expect(
      savedCountFromResultsFetch({
        rows: [{discordId: 'a', position: 1, dnf: false, dns: false}],
        error: null,
      }),
    ).toBe(1);
  });
});

describe('shouldLeaveResultsScreen', () => {
  it('redirects non-host viewers', () => {
    expect(shouldLeaveResultsScreen(event({}), null, guest)).toBe(true);
  });

  it('redirects when results already exist', () => {
    expect(shouldLeaveResultsScreen(event({}), 2, host)).toBe(true);
  });

  it('stays when host can submit and saved count is unknown', () => {
    expect(shouldLeaveResultsScreen(event({}), null, host)).toBe(false);
  });

  it('redirects completed events even when saved count is unknown', () => {
    expect(
      shouldLeaveResultsScreen(
        event({lifecycle: 'completed', status: 'ended'}),
        null,
        host,
      ),
    ).toBe(true);
  });

  it('redirects cruise hosts (no race results entry)', () => {
    expect(shouldLeaveResultsScreen(event({type: 'cruise'}), null, host)).toBe(true);
  });
});
