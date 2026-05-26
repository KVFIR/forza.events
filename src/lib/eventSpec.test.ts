import {describe, expect, it} from 'vitest';
import {
  canLeaveRegistration,
  eventHasStarted,
  isRegistrationOpen,
  normalizeTrackCodes,
  validateDraftForm,
} from './eventSpec';
import {VALIDATION_CODES} from './validationCodes';
import type {ForzaEvent} from './types';

function event(partial: Partial<ForzaEvent>): ForzaEvent {
  return {
    id: '1',
    slug: 'race',
    title: 'Race',
    type: 'road',
    status: 'open',
    lifecycle: 'open',
    startsAt: new Date(Date.now() + 86_400_000).toISOString(),
    carRuleMode: 'anything_goes',
    maxPi: 999,
    allowedCars: [],
    voicePolicy: 'optional',
    maxPlayers: 12,
    currentPlayers: 1,
    hostDiscordId: 'h1',
    hostUsername: 'host',
    rules: '',
    participants: [],
    ...partial,
  };
}

describe('normalizeTrackCodes', () => {
  it('trims and drops empty', () => {
    expect(normalizeTrackCodes(['  abc  ', '', 'def'])).toEqual(['abc', 'def']);
  });
});

describe('validateDraftForm', () => {
  it('requires title', () => {
    expect(
      validateDraftForm({
        title: '  ',
        type: 'road',
        startsAtLocal: '2030-01-01T12:00',
        guildId: 'g1',
      }),
    ).toBe(VALIDATION_CODES.TITLE_REQUIRED);
  });
});

describe('registration policy', () => {
  it('allows leave before start', () => {
    const e = event({lifecycle: 'open', status: 'open'});
    expect(isRegistrationOpen(e)).toBe(true);
    expect(canLeaveRegistration(e)).toBe(true);
  });

  it('blocks leave after start', () => {
    const e = event({
      lifecycle: 'live',
      status: 'live',
      startsAt: new Date(Date.now() - 60_000).toISOString(),
    });
    expect(eventHasStarted(e)).toBe(true);
    expect(canLeaveRegistration(e)).toBe(false);
  });
});
