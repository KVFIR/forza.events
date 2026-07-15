import {describe, expect, it} from 'vitest';
import {enrichPayloadForSend} from '../supabase/functions/_shared/notifications.ts';

describe('enrichPayloadForSend event_updated', () => {
  it('adds scheduleSummary when schedule changed', () => {
    const out = enrichPayloadForSend(
      'event_updated',
      {
        scheduleChanged: '1',
        startsAt: '2030-06-15T18:00:00.000Z',
        timezone: 'UTC',
      },
      'en',
    );
    expect(out.scheduleSummary).toBeTruthy();
    expect(out.scheduleSummary).toMatch(/Jun/);
  });

  it('omits carsSummary for open build without PI cap or notes', () => {
    const out = enrichPayloadForSend(
      'event_updated',
      {
        carsChanged: '1',
        carMode: 'anything_goes',
        maxPi: null,
        additionalCarRestrictions: null,
        carCount: 0,
      },
      'en',
    );
    expect(out.carsSummary).toBe('');
  });

  it('summarizes open-build PI cap changes', () => {
    const out = enrichPayloadForSend(
      'event_updated',
      {
        carsChanged: '1',
        carMode: 'anything_goes',
        maxPi: 650,
        additionalCarRestrictions: null,
        carCount: 0,
      },
      'en',
    );
    expect(out.carsSummary).toBe('PI cap 650');
  });
});
