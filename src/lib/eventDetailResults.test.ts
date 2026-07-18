import {describe, expect, it, vi, beforeEach} from 'vitest';
import {loadResultRowsForPublishedEvent} from './eventDetailResults';
import * as events from './events';
import type {ForzaEvent} from './types';

function event(partial: Partial<ForzaEvent>): ForzaEvent {
  return {
    id: 'ev-1',
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
    ...partial,
  };
}

describe('loadResultRowsForPublishedEvent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('skips fetch when results section is hidden', async () => {
    const fetchSpy = vi.spyOn(events, 'fetchEventResults');
    const outcome = await loadResultRowsForPublishedEvent(
      'ev-1',
      event({lifecycle: 'cancelled'}),
    );
    expect(outcome).toEqual({rows: [], failed: false});
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns failed when PostgREST read fails', async () => {
    vi.spyOn(events, 'fetchEventResults').mockResolvedValue({
      rows: [],
      error: 'fetch_failed',
    });
    const outcome = await loadResultRowsForPublishedEvent('ev-1', event({}));
    expect(outcome).toEqual({rows: [], failed: true});
  });
});
