import {describe, expect, it} from 'vitest';
import {
  groupFillsOnJoin,
  groupFillsOnPromote,
  joinedNewActiveSeat,
} from '../supabase/functions/_shared/notificationParticipation.ts';

describe('notificationParticipation', () => {
  const roster = [
    {discord_id: 'a', group_index: 1, waitlisted: false},
    {discord_id: 'b', group_index: 1, waitlisted: false},
  ];

  it('re-upsert of an active racer is not a new seat', () => {
    expect(joinedNewActiveSeat({waitlisted: false}, false)).toBe(false);
    expect(
      groupFillsOnJoin({waitlisted: false}, false, roster, 1, 'a', 2),
    ).toBe(false);
  });

  it('new join that fills the group triggers fill detection', () => {
    expect(joinedNewActiveSeat(undefined, false)).toBe(true);
    expect(groupFillsOnJoin(undefined, false, roster, 1, 'c', 2)).toBe(true);
  });

  it('waitlist join is not a group fill', () => {
    expect(joinedNewActiveSeat(undefined, true)).toBe(false);
  });

  it('promote from waitlist that fills the group', () => {
    const fullRoster = [
      {group_index: 1, waitlisted: false},
      {group_index: 1, waitlisted: false},
    ];
    expect(groupFillsOnPromote(fullRoster, 1, 2)).toBe(true);
    expect(groupFillsOnPromote([{group_index: 1, waitlisted: false}], 1, 2)).toBe(false);
  });
});
