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
});
