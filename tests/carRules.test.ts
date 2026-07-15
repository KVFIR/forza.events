import {describe, expect, it} from 'vitest';
import {
  formatOpenBuildCarRulesDisplay,
  openBuildHasDisplayRules,
} from '../src/lib/carRules';
import {
  openBuildHasDisplayRules as edgeOpenBuildHasDisplayRules,
} from '@edge/carRules.ts';

describe('openBuildHasDisplayRules parity', () => {
  it('matches client and edge', () => {
    const cases: [string | null, number | null, string | null, boolean][] = [
      ['anything_goes', null, null, false],
      ['anything_goes', null, '  ', false],
      ['anything_goes', 800, null, true],
      ['anything_goes', null, 'No swap', true],
      ['restricted_list', null, null, false],
    ];
    for (const [mode, maxPi, notes, expected] of cases) {
      expect(
        openBuildHasDisplayRules({
          carRuleMode: mode as 'anything_goes',
          maxPi,
          additionalCarRestrictions: notes ?? undefined,
        }),
      ).toBe(expected);
      expect(edgeOpenBuildHasDisplayRules(mode, maxPi, notes)).toBe(expected);
    }
  });
});

describe('formatOpenBuildCarRulesDisplay', () => {
  it('returns null when both fields are empty', () => {
    expect(formatOpenBuildCarRulesDisplay({maxPi: null, additionalCarRestrictions: ''})).toBeNull();
  });

  it('returns PI only', () => {
    expect(formatOpenBuildCarRulesDisplay({maxPi: 650, additionalCarRestrictions: ''})).toEqual({
      notes: null,
      piLabel: 'A 650',
    });
  });
});
