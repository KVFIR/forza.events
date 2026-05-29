import {describe, expect, it} from 'vitest';
import {HOST_DRAFT_LIFECYCLE, isHostDraftLifecycle} from '../src/lib/draftEvents';
import {
  HOST_DRAFT_STATUSES,
  hostDraftStatusFilter,
  isHostDraftStatus,
} from '@edge/draftEvents.ts';

describe('host draft status filter', () => {
  it('only includes draft status', () => {
    expect(HOST_DRAFT_STATUSES).toEqual(['draft']);
    expect(hostDraftStatusFilter()).toEqual(['draft']);
  });

  it('isHostDraftStatus matches draft only', () => {
    expect(isHostDraftStatus('draft')).toBe(true);
    expect(isHostDraftStatus('open')).toBe(false);
    expect(isHostDraftStatus('completed')).toBe(false);
  });

  it('client lifecycle filter matches Edge status filter', () => {
    expect(HOST_DRAFT_LIFECYCLE).toBe(HOST_DRAFT_STATUSES[0]);
    expect(isHostDraftLifecycle(HOST_DRAFT_LIFECYCLE)).toBe(isHostDraftStatus(HOST_DRAFT_STATUSES[0]));
  });
});
