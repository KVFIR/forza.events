/** Result row shape for submit — keep in sync with supabase/functions/_shared/eventResults.ts */

export type ResultPlacementInput = {
  discordId: string;
  dnf: boolean;
  dns: boolean;
};

export type ResultSubmitRow = {
  discord_id: string;
  position: number | null;
  dnf: boolean;
  dns: boolean;
};

/** Finishers get positions 1..N; DNF/DNS rows are stored without a position. */
export function buildResultSubmitRows(placements: ResultPlacementInput[]): ResultSubmitRow[] {
  const finishers = placements.filter((p) => !p.dnf && !p.dns);
  const nonFinishers = placements.filter((p) => p.dnf || p.dns);

  return [
    ...finishers.map((p, index) => ({
      discord_id: p.discordId,
      position: index + 1,
      dnf: false,
      dns: false,
    })),
    ...nonFinishers.map((p) => ({
      discord_id: p.discordId,
      position: null,
      dnf: p.dnf,
      dns: p.dns,
    })),
  ];
}

export function sortEventResultRows<T extends {position: number | null; dnf: boolean; dns: boolean}>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const aFinisher = !a.dnf && !a.dns && a.position != null;
    const bFinisher = !b.dnf && !b.dns && b.position != null;
    if (aFinisher && bFinisher) return a.position! - b.position!;
    if (aFinisher) return -1;
    if (bFinisher) return 1;
    return 0;
  });
}

export function hasFinishingPosition(row: {
  position: number | null;
  dnf: boolean;
  dns: boolean;
}): boolean {
  return !row.dnf && !row.dns && row.position != null;
}
