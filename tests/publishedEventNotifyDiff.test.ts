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

  it('does not notify when alt-build rows are only reordered', () => {
    const cars = [
      {carId: 'car-1', maxPi: 800, tuneShareCode: '111 111 111', restrictions: []},
      {carId: 'car-1', maxPi: 900, tuneShareCode: '222 222 222', restrictions: ['No engine swap']},
    ];
    const withCars = {...baseline, carRuleMode: 'restricted_list' as const, cars};
    expect(
      publishedNotifyFieldsChanged({...withCars, cars: [cars[1]!, cars[0]!]}, withCars),
    ).toBe(false);
    expect(
      publishedNotifyFieldsChanged(
        {
          ...withCars,
          cars: [...cars, {carId: 'car-1', maxPi: 800, tuneShareCode: '333 333 333', restrictions: []}],
        },
        withCars,
      ),
    ).toBe(true);
  });
});
