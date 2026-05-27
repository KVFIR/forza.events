/** Keep in sync with src/lib/eventResults.ts */

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
