import {describe, expect, it} from 'vitest';
import {isKnownNotificationKind} from '../supabase/functions/_shared/notificationCopy.ts';

describe('isKnownNotificationKind', () => {
  it('accepts active kinds', () => {
    expect(isKnownNotificationKind('host_group_filled')).toBe(true);
    expect(isKnownNotificationKind('waitlist_seat_opened')).toBe(true);
  });

  it('rejects removed or unknown kinds', () => {
    expect(isKnownNotificationKind('host_lobby_full')).toBe(false);
    expect(isKnownNotificationKind('not_a_kind')).toBe(false);
  });
});
