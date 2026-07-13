/** Multi-group lobby routing — shared by event-participation and add-group. */

export const MAX_GROUPS = 5;

export type GroupMemberRow = {
  group_index: number;
  waitlisted: boolean | null;
  is_convoy_leader?: boolean | null;
};

export type NewGroupLeaderRow = {
  discord_id?: string;
  is_convoy_leader?: boolean | null;
  waitlisted?: boolean | null;
};

export type ParticipationSource = 'self_join' | 'host_assigned' | 'host_self_assigned';

export type HostLeaderProjection = {
  hostDiscordId: string;
  lobbyLeaderGamertag?: string | null;
  lobbyLeaderDiscordId?: string | null;
  lobbyLeaderIsHost?: boolean | null;
};

/** Active convoy leader in any group — cannot lead a newly added group. */
export function isActiveConvoyLeaderRow(
  row: Pick<NewGroupLeaderRow, 'is_convoy_leader' | 'waitlisted'>,
): boolean {
  return Boolean(row.is_convoy_leader) && !row.waitlisted;
}

/** Group-1 convoy leader stored only on `events` (no participant row yet). */
export function isHostDenormalizedConvoyLeader(projection: HostLeaderProjection): boolean {
  if (!projection.lobbyLeaderGamertag?.trim()) return false;
  if (projection.lobbyLeaderIsHost === false) return false;
  const leaderId = projection.lobbyLeaderDiscordId?.trim() || projection.hostDiscordId;
  return leaderId === projection.hostDiscordId;
}

/** Host-assigned leader for a new group: waitlist, guild member, active non-leader, or host without a leader row. */
export function canPickAsNewGroupLeader(
  roster: NewGroupLeaderRow[],
  candidateDiscordId: string,
  hostProjection?: HostLeaderProjection,
): boolean {
  const row = roster.find((r) => r.discord_id === candidateDiscordId);
  if (row) return !isActiveConvoyLeaderRow(row);
  if (
    hostProjection &&
    candidateDiscordId === hostProjection.hostDiscordId &&
    isHostDenormalizedConvoyLeader(hostProjection)
  ) {
    return false;
  }
  return true;
}

/** Keep voluntary joins when a racer is promoted to convoy leader of a new group. */
export function resolveAddGroupParticipationSource(
  leaderId: string,
  hostDiscordId: string,
  existingSource?: string | null,
): ParticipationSource {
  if (leaderId === hostDiscordId) return 'host_self_assigned';
  if (existingSource === 'self_join') return 'self_join';
  return 'host_assigned';
}

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
