export type CatalogCar = {
  id: string;
  make: string;
  model: string;
  year: number | null;
  pi: number;
};

let catalogCache: CatalogCar[] | null = null;

async function loadCatalog(): Promise<CatalogCar[]> {
  if (catalogCache) return catalogCache;

  const {default: catalog} = await import('../../supabase/seed/fh6cars.json');
  catalogCache = (
    catalog as {make: string; model: string; year: number | null; pi: number}[]
  ).map((c, i) => ({
    id: `catalog-${i}-${c.make}-${c.model}`.replace(/\s+/g, '-').slice(0, 80),
    make: c.make,
    model: c.model,
    year: c.year,
    pi: c.pi,
  }));

  return catalogCache;
}

/** Client-side search when Supabase is not configured (mock / local dev). */
export async function searchCarCatalog(query: string, limit = 20): Promise<CatalogCar[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const catalog = await loadCatalog();
  return catalog
    .filter((c) => {
      const hay = `${c.make} ${c.model} ${c.year ?? ''} ${c.pi}`.toLowerCase();
      return hay.includes(q);
    })
    .slice(0, limit);
}
