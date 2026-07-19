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

  it('returns failed when PostgREST read fails for completed events', async () => {
    vi.spyOn(events, 'fetchEventResults').mockResolvedValue({
      rows: [],
      error: 'fetch_failed',
    });
    const outcome = await loadResultRowsForPublishedEvent('ev-1', event({}));
    expect(outcome).toEqual({rows: [], failed: true});
  });

  it('does not surface loadFailed for live events still awaiting host results', async () => {
    vi.spyOn(events, 'fetchEventResults').mockResolvedValue({
      rows: [],
      error: 'fetch_failed',
    });
    const outcome = await loadResultRowsForPublishedEvent(
      'ev-1',
      event({
        lifecycle: 'live',
        status: 'live',
        startsAt: new Date(Date.now() - 60_000).toISOString(),
      }),
    );
    expect(outcome).toEqual({rows: [], failed: false});
  });

  it('does not surface loadFailed for open events past starts_at', async () => {
    vi.spyOn(events, 'fetchEventResults').mockResolvedValue({
      rows: [],
      error: 'fetch_failed',
    });
    const outcome = await loadResultRowsForPublishedEvent(
      'ev-1',
      event({
        lifecycle: 'open',
        status: 'open',
        startsAt: new Date(Date.now() - 60_000).toISOString(),
      }),
    );
    expect(outcome).toEqual({rows: [], failed: false});
  });

  it('uses embedded publishedResults without PostgREST', async () => {
    const fetchSpy = vi.spyOn(events, 'fetchEventResults');
    const rows = [{discordId: 'a', position: 1, dnf: false, dns: false}];
    const outcome = await loadResultRowsForPublishedEvent(
      'ev-1',
      event({publishedResults: rows}),
    );
    expect(outcome).toEqual({rows, failed: false});
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('forceNetwork bypasses embedded publishedResults', async () => {
    vi.spyOn(events, 'fetchEventResults').mockResolvedValue({
      rows: [{discordId: 'b', position: 1, dnf: false, dns: false}],
      error: null,
    });
    const outcome = await loadResultRowsForPublishedEvent(
      'ev-1',
      event({publishedResults: []}),
      {forceNetwork: true},
    );
    expect(outcome).toEqual({
      rows: [{discordId: 'b', position: 1, dnf: false, dns: false}],
      failed: false,
    });
  });
});
