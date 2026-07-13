import {describe, expect, it} from 'vitest';
import {publishedTracksOrCarsChanged} from '../src/lib/publishedEventNotifyDiff';

describe('publishedTracksOrCarsChanged', () => {
  const baseline = {
    tracks: [{name: 'Laguna', shareCode: '', format: ''}],
    carRuleMode: 'anything_goes' as const,
    maxPi: 800,
    additionalCarRestrictions: '',
    cars: [],
  };

  it('returns false when nothing changed', () => {
    expect(publishedTracksOrCarsChanged(baseline, baseline)).toBe(false);
  });

  it('detects track edits', () => {
    expect(
      publishedTracksOrCarsChanged(
        {...baseline, tracks: [{name: 'Road Atlanta', shareCode: '', format: ''}]},
        baseline,
      ),
    ).toBe(true);
  });

  it('detects car rule edits', () => {
    expect(publishedTracksOrCarsChanged({...baseline, maxPi: 900}, baseline)).toBe(true);
  });
});
