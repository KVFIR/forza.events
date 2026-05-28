/**
 * Forza Horizon 6 Performance Index (100–999).
 * Class bands match the official FH6 car list (forza.net/fh6cars).
 */

export const PI_MIN = 100;
export const PI_MAX = 999;

/** FH6 classes (R = 901–998; X = 999 only). */
export type CarClassLetter = 'D' | 'C' | 'B' | 'A' | 'S1' | 'S2' | 'R' | 'X';

/** Official PI → class bands derived from forza.net/fh6cars */
export function piToClass(pi: number): CarClassLetter {
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

export function formatMaxPi(maxPi: number): string {
  const p = clampPi(maxPi);
  return `${piToClass(p)} ${p}`;
}

export const piClassColor: Record<CarClassLetter, string> = {
  D: 'text-slate-400',
  C: 'text-yellow-400/90',
  B: 'text-orange-400/90',
  A: 'text-red-400/90',
  S1: 'text-violet-400/90',
  S2: 'text-fuchsia-400/90',
  R: 'text-amber-400/90',
  X: 'text-rose-300/95',
};

export function clampPi(value: number): number {
  return Math.min(PI_MAX, Math.max(PI_MIN, Math.round(value)));
}

export function isPiInRange(value: number): boolean {
  const p = Math.round(value);
  return Number.isFinite(p) && p >= PI_MIN && p <= PI_MAX;
}

/** Params for `validation.piRange` (D 100 … X 999). */
export function piRangeI18nParams(): {
  minClass: CarClassLetter;
  minPi: number;
  maxClass: CarClassLetter;
  maxPi: number;
} {
  return {
    minClass: piToClass(PI_MIN),
    minPi: PI_MIN,
    maxClass: piToClass(PI_MAX),
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
