/** Multi-group lobby routing — shared by event-participation and add-group. */

export const MAX_GROUPS = 5;

export type GroupMemberRow = {
  group_index: number;
  waitlisted: boolean | null;
};

/** Active (non-waitlisted) participant count per group_index. */
export function activeCountsByGroup(rows: GroupMemberRow[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const r of rows) {
    if (r.waitlisted) continue;
    counts.set(r.group_index, (counts.get(r.group_index) ?? 0) + 1);
  }
  return counts;
}

/** First group (1..groupCount) with a free seat, or null when every group is full. */
export function firstOpenGroup(
  rows: GroupMemberRow[],
  groupCount: number,
  maxPlayers: number,
): number | null {
  const counts = activeCountsByGroup(rows);
  for (let g = 1; g <= groupCount; g++) {
    if ((counts.get(g) ?? 0) < maxPlayers) return g;
  }
  return null;
}

export function waitlistCount(rows: GroupMemberRow[]): number {
  return rows.reduce((n, r) => (r.waitlisted ? n + 1 : n), 0);
}
