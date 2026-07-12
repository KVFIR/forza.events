/** Result row shape for submit — keep in sync with supabase/functions/_shared/eventResults.ts */

export type ResultPlacementInput = {
  discordId: string;
  groupIndex?: number;
  dnf: boolean;
  dns: boolean;
};

export type ResultSubmitRow = {
  discord_id: string;
  position: number | null;
  dnf: boolean;
  dns: boolean;
  group_index: number;
};

/** Finishers get positions 1..N **within each group**; DNF/DNS rows have no position. */
export function buildResultSubmitRows(placements: ResultPlacementInput[]): ResultSubmitRow[] {
  const byGroup = new Map<number, ResultPlacementInput[]>();
  for (const p of placements) {
    const g = p.groupIndex ?? 1;
    const list = byGroup.get(g);
    if (list) list.push(p);
    else byGroup.set(g, [p]);
  }

  const rows: ResultSubmitRow[] = [];
  for (const group of [...byGroup.keys()].sort((a, b) => a - b)) {
    const placementsInGroup = byGroup.get(group)!;
    const finishers = placementsInGroup.filter((p) => !p.dnf && !p.dns);
    const nonFinishers = placementsInGroup.filter((p) => p.dnf || p.dns);
    finishers.forEach((p, index) => {
      rows.push({discord_id: p.discordId, position: index + 1, dnf: false, dns: false, group_index: group});
    });
    for (const p of nonFinishers) {
      rows.push({discord_id: p.discordId, position: null, dnf: p.dnf, dns: p.dns, group_index: group});
    }
  }
  return rows;
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
