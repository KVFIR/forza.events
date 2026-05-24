/**
 * Forza Horizon 6 Performance Index (100–999).
 * Class bands match the official FH6 car list (forza.net/fh6cars).
 */

export const PI_MIN = 100;
export const PI_MAX = 999;

/** FH6 classes (includes R — “Racing” tier) */
export type CarClassLetter = 'D' | 'C' | 'B' | 'A' | 'S1' | 'S2' | 'R';

/** Official PI → class bands derived from forza.net/fh6cars */
export function piToClass(pi: number): CarClassLetter {
  const p = clampPi(pi);
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
  return `Max PI ${p} (up to Class ${piToClass(p)})`;
}

export function clampPi(value: number): number {
  return Math.min(PI_MAX, Math.max(PI_MIN, Math.round(value)));
}

export const FH6_CLASS_BANDS: {class: CarClassLetter; min: number; max: number}[] = [
  {class: 'D', min: 100, max: 400},
  {class: 'C', min: 401, max: 500},
  {class: 'B', min: 501, max: 600},
  {class: 'A', min: 601, max: 700},
  {class: 'S1', min: 701, max: 800},
  {class: 'S2', min: 801, max: 900},
  {class: 'R', min: 901, max: 999},
];
