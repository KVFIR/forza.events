import type {CarClassLetter} from './pi';
import catalog from '../../supabase/seed/fh6cars.json';

export type CatalogCar = {
  id: string;
  make: string;
  model: string;
  year: number | null;
  pi: number;
  class: CarClassLetter;
};

const CATALOG: CatalogCar[] = (catalog as {make: string; model: string; year: number | null; pi: number; class: string}[]).map(
  (c, i) => ({
    id: `catalog-${i}-${c.make}-${c.model}`.replace(/\s+/g, '-').slice(0, 80),
    make: c.make,
    model: c.model,
    year: c.year,
    pi: c.pi,
    class: c.class as CarClassLetter,
  }),
);

/** Client-side search when Supabase is not configured (mock / local dev). */
export function searchCarCatalog(query: string, limit = 20): CatalogCar[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return CATALOG.filter((c) => {
    const hay = `${c.make} ${c.model} ${c.year ?? ''} ${c.pi} ${c.class}`.toLowerCase();
    return hay.includes(q);
  }).slice(0, limit);
}
