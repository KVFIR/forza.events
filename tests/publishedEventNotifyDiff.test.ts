import {describe, expect, it} from 'vitest';
import {publishedNotifyFieldsChanged} from '../src/lib/publishedEventNotifyDiff';

describe('publishedNotifyFieldsChanged', () => {
  const baseline = {
    startsAt: '2030-06-15T18:00:00.000Z',
    tracks: [{name: 'Laguna', shareCode: '', format: ''}],
    carRuleMode: 'anything_goes' as const,
    maxPi: 800,
    additionalCarRestrictions: '',
    cars: [],
  };

  it('returns false when nothing changed', () => {
    expect(publishedNotifyFieldsChanged(baseline, baseline)).toBe(false);
  });

  it('detects schedule edits', () => {
    expect(
      publishedNotifyFieldsChanged(
        {...baseline, startsAt: '2030-06-16T18:00:00.000Z'},
        baseline,
      ),
    ).toBe(true);
  });

  it('detects track edits', () => {
    expect(
      publishedNotifyFieldsChanged(
        {...baseline, tracks: [{name: 'Road Atlanta', shareCode: '', format: ''}]},
        baseline,
      ),
    ).toBe(true);
  });

  it('detects car rule edits', () => {
    expect(publishedNotifyFieldsChanged({...baseline, maxPi: 900}, baseline)).toBe(true);
  });

  it('detects clearing open-build PI cap', () => {
    expect(publishedNotifyFieldsChanged({...baseline, maxPi: null}, baseline)).toBe(true);
  });

  it('ignores sub-minute drift', () => {
    expect(
      publishedNotifyFieldsChanged(
        {...baseline, startsAt: '2030-06-15T18:00:30.000Z'},
        baseline,
      ),
    ).toBe(false);
  });
});
