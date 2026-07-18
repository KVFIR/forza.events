export type CarNameParts = {
  make: string;
  model: string;
  year?: number | null;
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

/** FH catalog stores full in-game name in `model` (usually prefixed with make). No year. */
export function formatCarDisplayName(car: CarNameParts): string {
  const model = stripYearFromModelTitle(car.model.trim());
  const make = car.make.trim();
  if (!make || !model) return model || make;
  if (model.toLowerCase().startsWith(make.toLowerCase())) {
    return model;
  }
  return `${make} ${model}`;
}

/** Collision key = what the viewer sees (so "BMW"+"M3" and "BMW"+"BMW M3" match). */
function carListKey(car: CarNameParts): string {
  return formatCarDisplayName(car).toLowerCase();
}

function carRowId(car: CarNameParts, index: number): string {
  return car.carId ?? car.id ?? `idx-${index}`;
}

/**
 * Labels for a car list. When several cars share the same display name and have years,
 * append `'YY` (e.g. Audi RS 4 Avant '01) — only on colliding rows.
 */
export function formatCarListDisplayNames(
  cars: readonly CarNameParts[],
): Map<string, string> {
  const counts = new Map<string, number>();
  for (const car of cars) {
    const key = carListKey(car);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const out = new Map<string, string>();
  cars.forEach((car, index) => {
    const base = formatCarDisplayName(car);
    const key = carListKey(car);
    const ambiguous = (counts.get(key) ?? 0) > 1;
    const suffix = ambiguous ? formatYearShort(resolveCarYear(car)) : '';
    out.set(carRowId(car, index), suffix ? `${base} ${suffix}` : base);
  });
  return out;
}

/** Single-car embed/card label; prefer formatCarListDisplayNames for lists. */
export function formatCarEmbedName(car: CarNameParts): string {
  return formatCarDisplayName(car);
}
