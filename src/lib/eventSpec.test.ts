import {describe, expect, it} from 'vitest';
import {
  canLeaveRegistration,
  eventHasStarted,
  isBrowseFeedEvent,
  isRegistrationOpen,
  resolveEventDisplayStatus,
  shouldShowEventResults,
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

describe('isBrowseFeedEvent', () => {
  const published = {discordMessageId: 'discord-msg-1'};

  it('includes upcoming published events', () => {
    expect(isBrowseFeedEvent(event({...published}))).toBe(true);
  });

  it('excludes live, completed, and cancelled', () => {
    expect(
      isBrowseFeedEvent(
        event({
          ...published,
          lifecycle: 'live',
          status: 'live',
          startsAt: new Date(Date.now() - 60_000).toISOString(),
        }),
      ),
    ).toBe(false);
    expect(
      isBrowseFeedEvent(
        event({
          ...published,
          lifecycle: 'completed',
          status: 'ended',
          startsAt: new Date(Date.now() - 3_600_000).toISOString(),
        }),
      ),
    ).toBe(false);
    expect(
      isBrowseFeedEvent(
        event({
          ...published,
          lifecycle: 'cancelled',
          status: 'ended',
          startsAt: new Date(Date.now() + 3_600_000).toISOString(),
        }),
      ),
    ).toBe(false);
  });

  it('excludes started events still marked open in the database', () => {
    expect(
      isBrowseFeedEvent(
        event({
          ...published,
          lifecycle: 'open',
          status: 'open',
          startsAt: new Date(Date.now() - 60_000).toISOString(),
        }),
      ),
    ).toBe(false);
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

describe('resolveEventDisplayStatus', () => {
  it('shows live when start time passed but DB status is still open', () => {
    const e = event({
      lifecycle: 'open',
      status: 'open',
      startsAt: new Date(Date.now() - 60_000).toISOString(),
    });
    expect(resolveEventDisplayStatus(e)).toBe('live');
  });

  it('shows ended when completed', () => {
    const e = event({
      lifecycle: 'completed',
      status: 'ended',
      startsAt: new Date(Date.now() - 3_600_000).toISOString(),
    });
    expect(resolveEventDisplayStatus(e)).toBe('ended');
  });

  it('prefers live over full after start', () => {
    const e = event({
      lifecycle: 'open',
      status: 'full',
      currentPlayers: 12,
      maxPlayers: 12,
      startsAt: new Date(Date.now() - 60_000).toISOString(),
    });
    expect(resolveEventDisplayStatus(e)).toBe('live');
  });
});

describe('shouldShowEventResults', () => {
  it('shows for completed events', () => {
    expect(
      shouldShowEventResults(
        event({
          lifecycle: 'completed',
          status: 'ended',
          startsAt: new Date(Date.now() - 3_600_000).toISOString(),
        }),
      ),
    ).toBe(true);
  });

  it('hides for cancelled events', () => {
    expect(
      shouldShowEventResults(
        event({
          lifecycle: 'cancelled',
          status: 'ended',
          startsAt: new Date(Date.now() - 3_600_000).toISOString(),
        }),
      ),
    ).toBe(false);
  });

  it('shows pending section after start before host submit', () => {
    expect(
      shouldShowEventResults(
        event({
          lifecycle: 'open',
          status: 'live',
          startsAt: new Date(Date.now() - 60_000).toISOString(),
        }),
      ),
    ).toBe(true);
  });

  it('hides before start', () => {
    expect(
      shouldShowEventResults(
        event({
          lifecycle: 'open',
          status: 'open',
          startsAt: new Date(Date.now() + 86_400_000).toISOString(),
        }),
      ),
    ).toBe(false);
  });

  it('hides for archived events after start', () => {
    expect(
      shouldShowEventResults(
        event({
          lifecycle: 'archived',
          status: 'ended',
          startsAt: new Date(Date.now() - 3_600_000).toISOString(),
        }),
      ),
    ).toBe(false);
  });
});
