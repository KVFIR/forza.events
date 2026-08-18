/** Forza HUD names are typically ≤16 chars; wiki omits "abbreviated as" when the full name already fits. */
export const FORZA_HUD_NAME_MAX = 16;

const TRAILING_TRIMS = [
  'Forza Edition',
  'Welcome Pack',
  'Time Attack Car Pack',
  'Italian Passion Car Pack',
  'Car Pass',
  'Race Car',
  'Show Car',
  'Limited Edition',
  'Super Sport',
  'Competizione',
  'Performante',
  'Biposto',
  'esseesse',
  'Stradale',
  'A-Spec',
  'Type S',
] as const;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function dropTrailingCarTrims(name: string): string {
  let s = name.trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const trim of TRAILING_TRIMS) {
      const next = s.replace(new RegExp(`\\s+${escapeRe(trim)}$`, 'i'), '').trim();
      if (next !== s && next.length >= 3) {
        s = next;
        changed = true;
        break;
      }
    }
  }
  return s;
}

function yearSuffix(year: number): string {
  return `'${String(Math.trunc(year)).slice(-2).padStart(2, '0')}`;
}

function fitWithYear(name: string, year: number | null, max: number): string {
  const suffix = year != null && Number.isFinite(year) ? ` ${yearSuffix(year)}` : '';
  const budget = Math.max(1, max - suffix.length);
  const words = name.split(/\s+/).filter(Boolean);
  const kept: string[] = [];
  for (const w of words) {
    const trial = kept.length ? `${kept.join(' ')} ${w}` : w;
    if (trial.length <= budget) kept.push(w);
    else break;
  }
  // ponytail: never emit a lone make + year ("Acura '01"); wiki acronyms (ITR) need the scrape
  if (kept.length < 2 && words.length >= 2) {
    return `${words[0]} ${words[1]}${suffix}`.trim();
  }
  if (kept.length === 0) {
    return `${name.slice(0, budget).trimEnd()}${suffix}`.trim();
  }
  return `${kept.join(' ')}${suffix}`.trim();
}

/**
 * When wiki has no "abbreviated as": keep HUD-length names; otherwise peel
 * trailing model words and append `'YY` (Porsche 911 Carrera RS → Porsche 911 '73).
 */
export function synthesizeCarAbbreviation(
  name: string,
  year: number | null | undefined,
): string {
  const n = name.trim();
  if (!n) return n;
  if (n.length <= FORZA_HUD_NAME_MAX) return n;
  const dropped = dropTrailingCarTrims(n);
  if (dropped.length <= FORZA_HUD_NAME_MAX) return dropped;
  const y = year == null ? null : Number(year);
  return fitWithYear(dropped, Number.isFinite(y) ? y : null, FORZA_HUD_NAME_MAX);
}

export function displayNameHasYearSuffix(name: string): boolean {
  return /'\d{2}$/.test(name.trim());
}

/**
 * First quoted alias after "abbreviated as" in wiki lead text.
 * Keep in sync with `parse_abbreviated_as` in scripts/fh6_fandom_normalize.py.
 */
export function parseWikiAbbreviations(wikitext: string): string[] {
  const lead = wikitext.match(
    /abbreviated\s+as\s+(.+?)(?:\s*[-–—]\s+is\b|\s+is\s+an?\s)/is,
  );
  if (!lead) return [];
  const blob = lead[1].replace(/<ref\b[^>]*>.*?<\/ref>|<ref\b[^>]*\/>/gis, '');
  const aliases: string[] = [];
  const seen = new Set<string>();
  for (const m of blob.matchAll(/"([^"]+)"|“([^”]+)”/g)) {
    let s = (m[1] ?? m[2] ?? '').trim();
    s = s.replace(/\[\[(?:[^\]]+\|)?([^\]]+)\]\]/g, '$1');
    s = s.replace(/'{2,}/g, '').trim();
    const key = s.toLowerCase();
    if (s && !seen.has(key)) {
      seen.add(key);
      aliases.push(s);
    }
  }
  return aliases;
}
