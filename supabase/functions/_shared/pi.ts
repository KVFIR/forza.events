/** FH6 PI → class (keep in sync with `src/lib/pi.ts`). */

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

/** FH6 classes (R = 901–998; X = 999 only). */
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

export function piRangeLabelEn(): string {
  return `D ${PI_MIN} to X ${PI_MAX}`;
}
