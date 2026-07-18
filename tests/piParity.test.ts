import {describe, expect, it} from 'vitest';
import {
  PI_MAX,
  PI_MIN,
  clampPi,
  formatMaxPi,
  isPiInRange,
  piRangeLabelEn,
  piToClass,
} from '@edge/pi.ts';
import {
  clampPi as clientClampPi,
  formatMaxPi as clientFormatMaxPi,
  isPiInRange as clientIsPiInRange,
  piToClass as clientPiToClass,
} from '../src/lib/pi';

describe('PI client/edge parity', () => {
  const samples = [100, 400, 401, 500, 600, 700, 800, 900, 901, 998, 999, 50, 1200];

  it('piToClass matches (fh6 default)', () => {
    for (const pi of samples) {
      expect(piToClass(pi)).toBe(clientPiToClass(pi));
      expect(piToClass(pi, 'fh6')).toBe(clientPiToClass(pi, 'fh6'));
    }
  });

  it('piToClass matches (fh5)', () => {
    for (const pi of samples) {
      expect(piToClass(pi, 'fh5')).toBe(clientPiToClass(pi, 'fh5'));
    }
    expect(piToClass(950, 'fh5')).toBe('S2');
    expect(piToClass(950, 'fh6')).toBe('R');
  });

  it('clampPi and isPiInRange match', () => {
    for (const pi of samples) {
      expect(clampPi(pi)).toBe(clientClampPi(pi));
      expect(isPiInRange(pi)).toBe(clientIsPiInRange(pi));
    }
  });

  it('formatMaxPi matches', () => {
    expect(formatMaxPi(999)).toBe(clientFormatMaxPi(999));
    expect(formatMaxPi(998)).toBe('R 998');
    expect(formatMaxPi(999)).toBe('X 999');
    expect(formatMaxPi(950, 'fh5')).toBe('S2 950');
  });

  it('constants and range label', () => {
    expect(PI_MIN).toBe(100);
    expect(PI_MAX).toBe(999);
    expect(piRangeLabelEn()).toBe('D 100 to X 999');
  });
});
