import {describe, expect, it} from 'vitest';
import {filterMyEvents} from './eventList';
import {userIsJoined, userIsParticipating} from './events';
import type {AppUser, ForzaEvent} from './types';

const user: AppUser = {
  discordId: 'u1',
  username: 'A',
  eventsJoined: 0,
  eventsHosted: 0,
  attendanceRate: 0,
  noShows: 0,
  hostRatingAvg: 0,
};

function event(participants: ForzaEvent['participants']): ForzaEvent {
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
    hostDiscordId: 'host',
    hostUsername: 'Host',
    rules: '',
    participants,
  };
}

describe('userIsParticipating', () => {
  it('returns true for waitlisted rows', () => {
    expect(
      userIsParticipating(
        event([
          {
            discordId: 'u1',
            username: 'A',
            participationSource: 'self_join',
            waitlisted: true,
          },
        ]),
        user,
      ),
    ).toBe(true);
  });

  it('returns true for host-assigned convoy leader', () => {
    expect(
      userIsParticipating(
        event([
          {
            discordId: 'u1',
            username: 'A',
            isConvoyLeader: true,
            participationSource: 'host_assigned',
          },
        ]),
        user,
      ),
    ).toBe(true);
  });

  it('returns false for the event host', () => {
    expect(
      userIsParticipating(
        event([
          {
            discordId: 'host',
            username: 'Host',
            isConvoyLeader: true,
            participationSource: 'host_self_assigned',
          },
        ]),
        {...user, discordId: 'host'},
      ),
    ).toBe(false);
  });
});

describe('userIsJoined', () => {
  it('returns true for active self_join rows', () => {
    expect(
      userIsJoined(
        event([
          {
            discordId: 'u1',
            username: 'A',
            participationSource: 'self_join',
          },
        ]),
        user,
      ),
    ).toBe(true);
  });

  it('returns true for host-assigned convoy leader', () => {
    expect(
      userIsJoined(
        event([
          {
            discordId: 'u1',
            username: 'A',
            isConvoyLeader: true,
            participationSource: 'host_assigned',
          },
        ]),
        user,
      ),
    ).toBe(true);
  });

  it('returns false for waitlisted rows', () => {
    expect(
      userIsJoined(
        event([
          {
            discordId: 'u1',
            username: 'A',
            participationSource: 'self_join',
            waitlisted: true,
          },
        ]),
        user,
      ),
    ).toBe(false);
  });

  it('returns false for the event host even with a leader row', () => {
    expect(
      userIsJoined(
        event([
          {
            discordId: 'host',
            username: 'Host',
            isConvoyLeader: true,
            participationSource: 'host_self_assigned',
          },
        ]),
        {...user, discordId: 'host'},
      ),
    ).toBe(false);
  });
});

describe('filterMyEvents', () => {
  const ev = event([
    {discordId: 'u1', username: 'A', participationSource: 'self_join', waitlisted: true},
  ]);
  const participating = (e: ForzaEvent) => userIsParticipating(e, user);

  it('includes waitlisted racers in joined scope', () => {
    expect(filterMyEvents([ev], user, 'joined', participating)).toHaveLength(1);
  });

  it('excludes waitlisted racers from active joined checks', () => {
    expect(userIsJoined(ev, user)).toBe(false);
  });
});
