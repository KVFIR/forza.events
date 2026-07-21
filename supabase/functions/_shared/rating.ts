/** Pairwise ELO for ranked FFA races (n ≤ 12). Keep pure — no Deno/DB imports. */

export const ELO_DEFAULT = 1000;
export const ELO_K_BASE = 32;
export const PROVISIONAL_GAMES = 5;
export const MIN_RATED_DRIVERS = 4;

export type PlayerRatingState = {
  discordId: string;
  rating: number;
  gamesRated: number;
};

export type RatingDelta = {
  discordId: string;
  ratingBefore: number;
  ratingAfter: number;
  delta: number;
};

export type ResultRowForRating = {
  discord_id: string;
  position: number | null;
  dnf?: boolean | null;
  dns?: boolean | null;
  group_index?: number | null;
};

export function effectiveK(gamesRated: number): number {
  return ELO_K_BASE / Math.sqrt(1 + Math.max(0, gamesRated));
}

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

export function isProvisional(gamesRated: number): boolean {
  return gamesRated < PROVISIONAL_GAMES;
}

/** Finishers by position asc, then DNFs (stable by discord_id). DNS excluded. */
export function orderRatedDrivers(rows: ResultRowForRating[]): string[] {
  const finishers = rows
    .filter((r) => !r.dns && !r.dnf && r.position != null)
    .sort((a, b) => (a.position as number) - (b.position as number));
  const dnfs = rows
    .filter((r) => !r.dns && r.dnf)
    .sort((a, b) => String(a.discord_id).localeCompare(String(b.discord_id)));
  return [...finishers, ...dnfs].map((r) => String(r.discord_id));
}

/**
 * Each lobby group is its own FFA race. Groups with fewer than MIN_RATED_DRIVERS
 * are skipped. Snapshot ratings are shared across groups (no mid-event chaining).
 */
export function planRatedGroupOrders(rows: ResultRowForRating[]): string[][] {
  const byGroup = new Map<number, ResultRowForRating[]>();
  for (const r of rows) {
    const g = r.group_index ?? 1;
    let list = byGroup.get(g);
    if (!list) {
      list = [];
      byGroup.set(g, list);
    }
    list.push(r);
  }
  const plans: string[][] = [];
  for (const g of [...byGroup.keys()].sort((a, b) => a - b)) {
    const ordered = orderRatedDrivers(byGroup.get(g)!);
    if (ordered.length >= MIN_RATED_DRIVERS) plans.push(ordered);
  }
  return plans;
}

/**
 * Pairwise ELO: each ordered pair (winner, loser) contributes a 1v1 update;
 * per-player deltas are averaged across their pairs, then rounded.
 */
export function computePairwiseElo(
  orderedIds: string[],
  states: Map<string, PlayerRatingState>,
): RatingDelta[] {
  const n = orderedIds.length;
  if (n < MIN_RATED_DRIVERS) return [];

  const sumDelta = new Map<string, number>();
  const pairCount = new Map<string, number>();
  for (const id of orderedIds) {
    sumDelta.set(id, 0);
    pairCount.set(id, 0);
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const idA = orderedIds[i]!;
      const idB = orderedIds[j]!;
      const a = states.get(idA);
      const b = states.get(idB);
      if (!a || !b) continue;

      const ea = expectedScore(a.rating, b.rating);
      const eb = expectedScore(b.rating, a.rating);
      const ka = effectiveK(a.gamesRated);
      const kb = effectiveK(b.gamesRated);

      // A finished ahead of B → A scores 1, B scores 0.
      sumDelta.set(idA, (sumDelta.get(idA) ?? 0) + ka * (1 - ea));
      sumDelta.set(idB, (sumDelta.get(idB) ?? 0) + kb * (0 - eb));
      pairCount.set(idA, (pairCount.get(idA) ?? 0) + 1);
      pairCount.set(idB, (pairCount.get(idB) ?? 0) + 1);
    }
  }

  const out: RatingDelta[] = [];
  for (const id of orderedIds) {
    const before = states.get(id)?.rating ?? ELO_DEFAULT;
    const pairs = pairCount.get(id) ?? 0;
    const avg = pairs > 0 ? (sumDelta.get(id) ?? 0) / pairs : 0;
    const after = Math.max(0, Math.round(before + avg));
    out.push({
      discordId: id,
      ratingBefore: before,
      ratingAfter: after,
      delta: after - before,
    });
  }
  return out;
}
