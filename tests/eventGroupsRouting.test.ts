import {describe, expect, it} from 'vitest';
import {firstOpenGroup, waitlistCount, MAX_GROUPS} from '@edge/eventGroups.ts';
import {firstOpenGroupIndex} from '../src/lib/eventSpec';
import type {ForzaEvent} from '../src/lib/types';

type Row = {group_index: number; waitlisted: boolean};

function rows(...counts: {group: number; active: number; queued?: number}[]): Row[] {
  const out: Row[] = [];
  for (const c of counts) {
    for (let i = 0; i < c.active; i++) out.push({group_index: c.group, waitlisted: false});
    for (let i = 0; i < (c.queued ?? 0); i++) out.push({group_index: c.group, waitlisted: true});
  }
  return out;
}

describe('firstOpenGroup (edge routing)', () => {
  it('returns the smallest group with a free seat', () => {
    expect(firstOpenGroup(rows({group: 1, active: 5}), 1, 12)).toBe(1);
    expect(firstOpenGroup(rows({group: 1, active: 12}, {group: 2, active: 3}), 2, 12)).toBe(2);
    expect(firstOpenGroup(rows({group: 1, active: 8}, {group: 2, active: 5}), 2, 12)).toBe(2);
    expect(firstOpenGroup(rows({group: 1, active: 5}, {group: 2, active: 5}), 2, 12)).toBe(1);
  });

  it('returns null when every active group is full (ignoring the queue)', () => {
    expect(firstOpenGroup(rows({group: 1, active: 12, queued: 4}), 1, 12)).toBeNull();
  });

  it('counts the waitlist', () => {
    expect(waitlistCount(rows({group: 1, active: 12, queued: 3}))).toBe(3);
  });

  it('never exceeds MAX_GROUPS', () => {
    expect(MAX_GROUPS).toBe(5);
  });
});

describe('client/edge routing parity', () => {
  it('agree on the first open group', () => {
    const base = {
      groupCount: 2,
      maxPlayers: 12,
      participants: [
        ...Array.from({length: 12}, (_, i) => ({
          discordId: `a${i}`,
          username: 'x',
          groupIndex: 1,
          waitlisted: false,
        })),
        {discordId: 'b0', username: 'x', groupIndex: 2, waitlisted: false},
      ],
    } as unknown as ForzaEvent;
    const edgeRows = base.participants.map((p) => ({
      group_index: p.groupIndex ?? 1,
      waitlisted: p.waitlisted ?? false,
    }));
    expect(firstOpenGroupIndex(base)).toBe(firstOpenGroup(edgeRows, 2, 12));
  });
});
