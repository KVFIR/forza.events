/**
 * Shared catalog helpers for FH5/FH6 app JSON builders.
 * Year lives in `year` — never leave "(YYYY)" in `model`.
 */

/** Strip "(YYYY)" year parentheticals from a vehicle title (keep edition suffixes). */
export function stripYearFromModelTitle(model) {
  return String(model ?? '')
    .replace(/\s*\(([12][0-9]{3})\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export const PI_MIN = 100;
export const PI_MAX = 999;

/** FH6 bands (R = 901–998). Keep in sync with src/lib/pi.ts */
export function piToClassFh6(pi) {
  const p = Math.min(PI_MAX, Math.max(PI_MIN, Math.round(pi)));
  if (p === PI_MAX) return 'X';
  if (p >= 901) return 'R';
  if (p >= 801) return 'S2';
  if (p >= 701) return 'S1';
  if (p >= 601) return 'A';
  if (p >= 501) return 'B';
  if (p >= 401) return 'C';
  return 'D';
}

/** FH5 bands (no R; S2 = 901–998). Keep in sync with src/lib/pi.ts */
export function piToClassFh5(pi) {
  const p = Math.min(PI_MAX, Math.max(PI_MIN, Math.round(pi)));
  if (p === PI_MAX) return 'X';
  if (p >= 901) return 'S2';
  if (p >= 801) return 'S1';
  if (p >= 701) return 'A';
  if (p >= 601) return 'B';
  if (p >= 501) return 'C';
  return 'D';
}

export function piToClass(pi, game) {
  return game === 'fh5' ? piToClassFh5(pi) : piToClassFh6(pi);
}
