import {describe, expect, it} from 'vitest';
import {userIsJoined} from './events';
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

describe('userIsJoined', () => {
  it('returns true only for self_join rows', () => {
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

  it('returns false for waitlisted self_join rows', () => {
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

  it('returns false for host-assigned convoy leader without self join', () => {
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
    ).toBe(false);
  });

  it('returns false for host self-assigned leader row', () => {
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
        { ...user, discordId: 'host' },
      ),
    ).toBe(false);
  });
});
