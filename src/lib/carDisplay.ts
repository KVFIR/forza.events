import {
  displayNameHasYearSuffix,
  synthesizeCarAbbreviation,
} from '@edge/carAbbreviation.ts';

export {displayNameHasYearSuffix};

export type CarNameParts = {
  make: string;
  model: string;
  year?: number | null;
  abbreviation?: string | null;
  id?: string;
  carId?: string;
};

/** Strip "(YYYY)" parentheticals — year lives in `year`. Keep in sync with catalog builders. */
export function stripYearFromModelTitle(model: string): string {
  return String(model ?? '')
    .replace(/\s*\(([12][0-9]{3})\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Prefer `year` column; if missing, fall back to a "(YYYY)" in the model title
 * (legacy rows before catalog strip/seed).
 */
export function resolveCarYear(car: Pick<CarNameParts, 'year' | 'model'>): number | null {
  if (car.year != null) {
    const n = Number(car.year);
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  const match = String(car.model ?? '').match(/\(([12][0-9]{3})\)/);
  return match ? Number(match[1]) : null;
}

/** Short year suffix for disambiguation: 2001 → '01 */
export function formatYearShort(year: number | null | undefined): string {
  if (year == null || !Number.isFinite(year)) return '';
  const y = Math.trunc(year);
  return `'${String(y).slice(-2).padStart(2, '0')}`;
}

/** Full catalog title (make + model). Wiki HUD names go through `abbreviation`. */
export function formatCarFullName(car: CarNameParts): string {
  const model = stripYearFromModelTitle(car.model.trim());
  const make = car.make.trim();
  if (!make || !model) return model || make;
  if (model.toLowerCase().startsWith(make.toLowerCase())) {
    return model;
  }
  return `${make} ${model}`;
}

/** Wiki "abbreviated as" when present; otherwise a HUD-length fallback. */
export function formatCarDisplayName(car: CarNameParts): string {
  const abbr = car.abbreviation?.trim();
  if (abbr) return abbr;
  return synthesizeCarAbbreviation(formatCarFullName(car), resolveCarYear(car));
}

/** Collision key = what the viewer sees (so "BMW"+"M3" and "BMW"+"BMW M3" match). */
function carListKey(car: CarNameParts, full: boolean): string {
  return (full ? formatCarFullName(car) : formatCarDisplayName(car)).toLowerCase();
}

function carRowId(car: CarNameParts, index: number): string {
  // Instance id (event_cars row / Create `id`); catalog `carId` is not unique for alt builds.
  return car.id ?? car.carId ?? `idx-${index}`;
}

/**
 * Labels for a car list. When several cars share the same display name and have
 * *different* years, append `'YY` (e.g. Audi RS 4 Avant '01) — only on colliding rows.
 * Same-year alt builds keep the base name (PI / tune distinguish them in the row).
 * `full: true` keeps catalog titles (Create / Event Detail); default is HUD abbreviation.
 */
export function formatCarListDisplayNames(
  cars: readonly CarNameParts[],
  options?: {full?: boolean},
): Map<string, string> {
  const full = Boolean(options?.full);
  const labelOf = full ? formatCarFullName : formatCarDisplayName;
  const counts = new Map<string, number>();
  const years = new Map<string, Set<number | ''>>();
  for (const car of cars) {
    const key = carListKey(car, full);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    const y = resolveCarYear(car);
    let set = years.get(key);
    if (!set) {
      set = new Set();
      years.set(key, set);
    }
    set.add(y ?? '');
  }

  const out = new Map<string, string>();
  cars.forEach((car, index) => {
    const base = labelOf(car);
    const key = carListKey(car, full);
    const yearsDiffer = (years.get(key)?.size ?? 0) > 1;
    const suffix =
      (counts.get(key) ?? 0) > 1 && yearsDiffer && !displayNameHasYearSuffix(base)
        ? formatYearShort(resolveCarYear(car))
        : '';
    out.set(carRowId(car, index), suffix ? `${base} ${suffix}` : base);
  });
  if (full) return out;
  const seen = new Map<string, number>();
  for (const label of out.values()) {
    const k = label.toLowerCase();
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  cars.forEach((car, index) => {
    const id = carRowId(car, index);
    const label = out.get(id);
    if (label && (seen.get(label.toLowerCase()) ?? 0) > 1) {
      out.set(id, formatCarFullName(car));
    }
  });
  return out;
}

/** Single-car embed/card label; prefer formatCarListDisplayNames for lists. */
export function formatCarEmbedName(car: CarNameParts): string {
  return formatCarDisplayName(car);
}
