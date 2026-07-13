import {describe, expect, it} from 'vitest';
import {eventUpdateRecipients} from '../supabase/functions/_shared/notificationTriggers.ts';

describe('eventUpdateRecipients', () => {
  const roster = [
    {discord_id: 'a', waitlisted: false},
    {discord_id: 'b', waitlisted: true},
  ];

  it('notifies active racers only for tracks/cars edits', () => {
    expect(eventUpdateRecipients(roster, false).map((r) => r.discord_id)).toEqual(['a']);
  });

  it('includes waitlist when schedule changes', () => {
    expect(eventUpdateRecipients(roster, true).map((r) => r.discord_id)).toEqual(['a', 'b']);
  });
});
