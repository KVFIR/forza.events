/** FH PI → class (keep in sync with `src/lib/pi.ts`). */

import type {ForzaGame} from './eventGames.ts';

export const PI_MIN = 100;
export const PI_MAX = 999;

export type CarClassLetter = 'D' | 'C' | 'B' | 'A' | 'S1' | 'S2' | 'R' | 'X';

export function clampPi(value: number): number {
  return Math.min(PI_MAX, Math.max(PI_MIN, Math.round(value)));
}

export function isPiInRange(value: number): boolean {
  const p = Math.round(value);
  return Number.isFinite(p) && p >= PI_MIN && p <= PI_MAX;
}

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

export function piRangeLabelEn(game: ForzaGame = 'fh6'): string {
  return `${piToClass(PI_MIN, game)} ${PI_MIN} to ${piToClass(PI_MAX, game)} ${PI_MAX}`;
}
