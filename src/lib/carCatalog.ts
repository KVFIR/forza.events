import type {ForzaGame} from './eventGames';

export type CatalogCar = {
  id: string;
  make: string;
  model: string;
  year: number | null;
  pi: number;
  game: ForzaGame;
  abbreviation?: string | null;
  aliases?: string[];
};

let catalogCache: CatalogCar[] | null = null;

async function loadCatalog(): Promise<CatalogCar[]> {
  if (catalogCache) return catalogCache;

  const [{default: fh6}, {default: fh5}] = await Promise.all([
    import('../../supabase/seed/fh6cars.json'),
    import('../../supabase/seed/fh5cars.json'),
  ]);

  const rows: CatalogCar[] = [];
  const push = (catalog: unknown, game: ForzaGame) => {
    const list = catalog as {
      make: string;
      model: string;
      year: number | null;
      pi: number;
      abbreviation?: string | null;
      aliases?: string[];
    }[];
    list.forEach((c, i) => {
      rows.push({
        id: `catalog-${game}-${i}-${c.make}-${c.model}`.replace(/\s+/g, '-').slice(0, 80),
        make: c.make,
        model: c.model,
        year: c.year,
        pi: c.pi,
        game,
        abbreviation: c.abbreviation ?? null,
        aliases: Array.isArray(c.aliases) ? c.aliases : [],
      });
    });
  };
  push(fh6, 'fh6');
  push(fh5, 'fh5');
  catalogCache = rows;
  return catalogCache;
}

/** Client-side search when Supabase is not configured. */
export async function searchCarCatalog(
  query: string,
  options: {limit?: number; game?: ForzaGame} = {},
): Promise<CatalogCar[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const limit = options.limit ?? 20;
  const game = options.game ?? 'fh6';

  const catalog = await loadCatalog();
  return catalog
    .filter((c) => c.game === game)
    .filter((c) => {
      const hay = [
        c.make,
        c.model,
        c.year ?? '',
        c.pi,
        c.abbreviation ?? '',
        ...(c.aliases ?? []),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    })
    .slice(0, limit);
}
