import {describe, expect, it} from 'vitest';
import {GAMERTAG_RE, hasGamertag, isValidGamertag} from './gamertag';

describe('gamertag', () => {
  it('matches Xbox rules', () => {
    expect(GAMERTAG_RE.test('Player One')).toBe(true);
    expect(GAMERTAG_RE.test('')).toBe(false);
    expect(GAMERTAG_RE.test('a'.repeat(16))).toBe(false);
    expect(GAMERTAG_RE.test('bad!')).toBe(false);
  });

  it('hasGamertag', () => {
    expect(hasGamertag('  x  ')).toBe(true);
    expect(hasGamertag('')).toBe(false);
  });

  it('isValidGamertag', () => {
    expect(isValidGamertag(' GT1 ')).toBe(true);
    expect(isValidGamertag('!!!')).toBe(false);
  });
});
