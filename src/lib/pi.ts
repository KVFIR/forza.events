/**
 * Forza Horizon Performance Index (100–999).
 * Class bands differ by game — keep Edge `_shared/pi.ts` in sync.
 */

import type {ForzaGame} from './eventGames';

export const PI_MIN = 100;
export const PI_MAX = 999;

/** Shared letter set (FH6 adds R; FH5 maps 901–998 to S2). */
export type CarClassLetter = 'D' | 'C' | 'B' | 'A' | 'S1' | 'S2' | 'R' | 'X';

/** FH6 classes (R = 901–998; X = 999 only). Official forza.net/fh6cars bands. */
export function piToClassFh6(pi: number): CarClassLetter {
  const p = clampPi(pi);
  if (p === PI_MAX) return 'X';
  if (p >= 901) return 'R';
  if (p >= 801) return 'S2';
  if (p >= 701) return 'S1';
  if (p >= 601) return 'A';
  if (p >= 501) return 'B';
  if (p >= 401) return 'C';
  return 'D';
}

/** FH5 classes (no R; S2 = 901–998). */
export function piToClassFh5(pi: number): CarClassLetter {
  const p = clampPi(pi);
  if (p === PI_MAX) return 'X';
  if (p >= 901) return 'S2';
  if (p >= 801) return 'S1';
  if (p >= 701) return 'A';
  if (p >= 601) return 'B';
  if (p >= 501) return 'C';
  return 'D';
}

export function piToClass(pi: number, game: ForzaGame = 'fh6'): CarClassLetter {
  return game === 'fh5' ? piToClassFh5(pi) : piToClassFh6(pi);
}

export function formatMaxPi(maxPi: number, game: ForzaGame = 'fh6'): string {
  const p = clampPi(maxPi);
  return `${piToClass(p, game)} ${p}`;
}

/** `B 600`, same-class `B 600–650`, or `B 600–S1 765`. */
export function formatPiRange(
  minPi: number,
  maxPi: number,
  game: ForzaGame = 'fh6',
): string {
  const min = clampPi(minPi);
  const max = clampPi(maxPi);
  const from = piToClass(min, game);
  const to = piToClass(max, game);
  if (min === max) return `${from} ${min}`;
  if (from === to) return `${from} ${min}–${max}`;
  return `${from} ${min}–${to} ${max}`;
}

/** Class letter or `B–S1` when min/max straddle bands. */
export function classRangeLabel(
  minPi: number,
  maxPi: number,
  game: ForzaGame = 'fh6',
): string {
  const from = piToClass(minPi, game);
  const to = piToClass(maxPi, game);
  return from === to ? from : `${from}–${to}`;
}

export function restrictedCarsPiBounds(
  cars: readonly {maxPi: number}[],
): {minPi: number; maxPi: number} | null {
  if (cars.length === 0) return null;
  let minPi = cars[0]!.maxPi;
  let maxPi = cars[0]!.maxPi;
  for (const car of cars) {
    if (car.maxPi < minPi) minPi = car.maxPi;
    if (car.maxPi > maxPi) maxPi = car.maxPi;
  }
  return {minPi, maxPi};
}

export function restrictedCarsClassRange(
  cars: readonly {maxPi: number}[],
  game: ForzaGame = 'fh6',
): string | null {
  const span = restrictedCarsPiBounds(cars);
  if (!span) return null;
  return classRangeLabel(span.minPi, span.maxPi, game);
}

export const piClassHex: Record<CarClassLetter, string> = {
  D: '#49b7f8',
  C: '#faca33',
  B: '#f8682c',
  A: '#f91648',
  S1: '#ba66e9',
  S2: '#185cdf',
  R: '#d7189a',
  X: '#16d858',
};

export const piClassColor: Record<CarClassLetter, string> = {
  D: 'text-[#49b7f8]/80',
  C: 'text-[#faca33]/80',
  B: 'text-[#f8682c]/80',
  A: 'text-[#f91648]/70',
  S1: 'text-[#ba66e9]/80',
  S2: 'text-[#185cdf]/80',
  R: 'text-[#d7189a]/80',
  X: 'text-[#16d858]/80',
};

export const piClassBorderColor: Record<CarClassLetter, string> = {
  D: 'border-[#49b7f8]/30',
  C: 'border-[#faca33]/30',
  B: 'border-[#f8682c]/30',
  A: 'border-[#f91648]/25',
  S1: 'border-[#ba66e9]/30',
  S2: 'border-[#185cdf]/30',
  R: 'border-[#d7189a]/30',
  X: 'border-[#16d858]/30',
};

export function clampPi(value: number): number {
  return Math.min(PI_MAX, Math.max(PI_MIN, Math.round(value)));
}

export function isPiInRange(value: number): boolean {
  const p = Math.round(value);
  return Number.isFinite(p) && p >= PI_MIN && p <= PI_MAX;
}

/** Params for `validation.piRange` (D 100 … X 999). */
export function piRangeI18nParams(game: ForzaGame = 'fh6'): {
  minClass: CarClassLetter;
  minPi: number;
  maxClass: CarClassLetter;
  maxPi: number;
} {
  return {
    minClass: piToClass(PI_MIN, game),
    minPi: PI_MIN,
    maxClass: piToClass(PI_MAX, game),
    maxPi: PI_MAX,
  };
}

export const FH6_CLASS_BANDS: {class: CarClassLetter; min: number; max: number}[] = [
  {class: 'D', min: 100, max: 400},
  {class: 'C', min: 401, max: 500},
  {class: 'B', min: 501, max: 600},
  {class: 'A', min: 601, max: 700},
  {class: 'S1', min: 701, max: 800},
  {class: 'S2', min: 801, max: 900},
  {class: 'R', min: 901, max: 998},
  {class: 'X', min: 999, max: 999},
];

export const FH5_CLASS_BANDS: {class: CarClassLetter; min: number; max: number}[] = [
  {class: 'D', min: 100, max: 500},
  {class: 'C', min: 501, max: 600},
  {class: 'B', min: 601, max: 700},
  {class: 'A', min: 701, max: 800},
  {class: 'S1', min: 801, max: 900},
  {class: 'S2', min: 901, max: 998},
  {class: 'X', min: 999, max: 999},
];
