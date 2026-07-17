import {describe, expect, it} from 'vitest';
import {bypassesDmOptOut} from '../supabase/functions/_shared/notifications.ts';

describe('bypassesDmOptOut', () => {
  it('bypasses opt-out for schedule event_updated', () => {
    expect(bypassesDmOptOut('event_updated', {scheduleChanged: '1'})).toBe(true);
  });

  it('respects opt-out for tracks-only event_updated', () => {
    expect(bypassesDmOptOut('event_updated', {tracksChanged: '1'})).toBe(false);
  });

  it('bypasses opt-out for transactional waitlist kinds', () => {
    expect(bypassesDmOptOut('waitlist_seat_opened', {})).toBe(true);
    expect(bypassesDmOptOut('group_reassigned', {})).toBe(true);
  });
});
