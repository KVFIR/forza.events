import {describe, expect, it} from 'vitest';
import {
  FH6_CLASS_BANDS,
  PI_MAX,
  PI_MIN,
  clampPi,
  formatMaxPi,
  isPiInRange,
  piRangeI18nParams,
  piToClass,
} from './pi';

describe('piToClass', () => {
  it('maps FH6 bands: R at 901–998, X at 999', () => {
    expect(piToClass(100)).toBe('D');
    expect(piToClass(400)).toBe('D');
    expect(piToClass(401)).toBe('C');
    expect(piToClass(500)).toBe('C');
    expect(piToClass(501)).toBe('B');
    expect(piToClass(600)).toBe('B');
    expect(piToClass(601)).toBe('A');
    expect(piToClass(700)).toBe('A');
    expect(piToClass(701)).toBe('S1');
    expect(piToClass(800)).toBe('S1');
    expect(piToClass(801)).toBe('S2');
    expect(piToClass(900)).toBe('S2');
    expect(piToClass(901)).toBe('R');
    expect(piToClass(998)).toBe('R');
    expect(piToClass(999)).toBe('X');
  });
});

describe('PI limits', () => {
  it('clamps and validates D 100 through X 999', () => {
    expect(clampPi(50)).toBe(PI_MIN);
    expect(clampPi(1500)).toBe(PI_MAX);
    expect(isPiInRange(999)).toBe(true);
    expect(isPiInRange(1000)).toBe(false);
    expect(isPiInRange(99)).toBe(false);
  });

  it('formatMaxPi shows class letter', () => {
    expect(formatMaxPi(998)).toBe('R 998');
    expect(formatMaxPi(999)).toBe('X 999');
    expect(formatMaxPi(900)).toBe('S2 900');
  });

  it('piRangeI18nParams matches caps', () => {
    expect(piRangeI18nParams()).toEqual({
      minClass: 'D',
      minPi: 100,
      maxClass: 'X',
      maxPi: 999,
    });
  });

  it('FH6_CLASS_BANDS ends with R then X', () => {
    expect(FH6_CLASS_BANDS.at(-2)).toEqual({class: 'R', min: 901, max: 998});
    expect(FH6_CLASS_BANDS.at(-1)).toEqual({class: 'X', min: 999, max: 999});
  });
});
