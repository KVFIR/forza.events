/** Keep in sync with src/lib/eventResults.ts */

export type ResultsRankingMode = 'per_group' | 'overall';

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

/**
 * Build submit rows from ordered placements.
 * - `per_group` (default): positions restart at 1 within each convoy.
 * - `overall`: one global 1..N across all convoys (group_index still from roster).
 */
export function buildResultSubmitRows(
  placements: ResultPlacementInput[],
  mode: ResultsRankingMode = 'per_group',
): ResultSubmitRow[] {
  if (mode === 'overall') {
    const finishers = placements.filter((p) => !p.dnf && !p.dns);
    const nonFinishers = placements.filter((p) => p.dnf || p.dns);
    return [
      ...finishers.map((p, index) => ({
        discord_id: p.discordId,
        position: index + 1,
        dnf: false,
        dns: false,
        group_index: p.groupIndex ?? 1,
      })),
      ...nonFinishers.map((p) => ({
        discord_id: p.discordId,
        position: null,
        dnf: p.dnf,
        dns: p.dns,
        group_index: p.groupIndex ?? 1,
      })),
    ];
  }

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

export function validateResultSubmitRow(row: {
  position: number | null;
  dnf?: boolean;
  dns?: boolean;
}): string | null {
  const dnf = row.dnf ?? false;
  const dns = row.dns ?? false;
  if (dnf && dns) return 'DNF and DNS cannot both be set';
  if (dnf || dns) {
    if (row.position != null) return 'DNF/DNS rows must not have a position';
    return null;
  }
  if (row.position == null || row.position < 1) {
    return 'Finishers require a position';
  }
  return null;
}
