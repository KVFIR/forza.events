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

/** Wiki "abbreviated as" aliases from the scrape dump (first = HUD name). */
export function catalogAliases(car) {
  const raw = Array.isArray(car.abbreviated_as) ? car.abbreviated_as : [];
  const aliases = [];
  const seen = new Set();
  for (const a of raw) {
    const s = String(a ?? '').trim();
    const k = s.toLowerCase();
    if (!s || seen.has(k)) continue;
    seen.add(k);
    aliases.push(s);
  }
  return aliases;
}

function raceNumbersIn(text) {
  return new Set([...String(text ?? '').matchAll(/#(\d+)/g)].map((m) => m[1]));
}

/**
 * Drop wiki HUD aliases whose #N is not on the catalog title (copy-paste leads).
 * If every numbered alias is wrong, keep a title prefix through the race number.
 */
export function filterRaceNumberAliases(model, aliases) {
  const titleNums = raceNumbersIn(model);
  if (titleNums.size === 0) return aliases;
  const matched = aliases.filter((a) => {
    const nums = raceNumbersIn(a);
    if (nums.size === 0) return true;
    for (const n of nums) {
      if (titleNums.has(n)) return true;
    }
    return false;
  });
  if (matched.length) return matched;
  const fallback = String(model).match(/^(.*?#\d+)/);
  return fallback ? [fallback[1].trim()] : [];
}
