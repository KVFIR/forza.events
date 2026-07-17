/** Multi-group lobby routing — shared by event-participation and add-group. */

export const MAX_GROUPS = 5;

export type GroupMemberRow = {
  group_index: number;
  waitlisted: boolean | null;
  is_convoy_leader?: boolean | null;
};

export type NewGroupLeaderRow = {
  discord_id?: string;
  group_index?: number | null;
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

/** Active convoy leader discord id for a group (group 1 falls back to denormalized host fields). */
export function resolveActiveGroupLeaderId(
  roster: NewGroupLeaderRow[],
  groupIndex: number,
  hostProjection?: HostLeaderProjection,
): string | null {
  const row = roster.find(
    (r) =>
      r.discord_id &&
      isActiveConvoyLeaderRow(r) &&
      (r.group_index ?? 1) === groupIndex,
  );
  if (row?.discord_id) return row.discord_id;
  if (groupIndex !== 1 || !hostProjection) return null;
  const gt = hostProjection.lobbyLeaderGamertag?.trim();
  if (!gt) return null;
  if (hostProjection.lobbyLeaderIsHost === false) {
    return hostProjection.lobbyLeaderDiscordId?.trim() ?? null;
  }
  return hostProjection.lobbyLeaderDiscordId?.trim() || hostProjection.hostDiscordId;
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

/** Group with the fewest active racers that still has a free seat; tie-break lower group index. */
export function firstOpenGroup(
  rows: GroupMemberRow[],
  groupCount: number,
  maxPlayers: number,
): number | null {
  const counts = activeCountsByGroup(rows);
  let best: number | null = null;
  let bestSize = Infinity;
  for (let g = 1; g <= groupCount; g++) {
    const size = counts.get(g) ?? 0;
    if (size >= maxPlayers) continue;
    if (size < bestSize || (size === bestSize && (best == null || g < best))) {
      best = g;
      bestSize = size;
    }
  }
  return best;
}

export function waitlistCount(rows: GroupMemberRow[]): number {
  return rows.reduce((n, r) => (r.waitlisted ? n + 1 : n), 0);
}

export type BalanceRosterRow = {
  discord_id: string;
  group_index: number | null;
  waitlisted: boolean | null;
  is_convoy_leader?: boolean | null;
  joined_at?: string | null;
};

export type GroupMovePlan = {
  discord_id: string;
  from_group: number;
  to_group: number;
};

/** Per-group active headcount targets; extra racers go to lower-numbered groups. */
export function balancedGroupTargets(totalActive: number, groupCount: number): number[] {
  const base = Math.floor(totalActive / groupCount);
  let remainder = totalActive % groupCount;
  const targets: number[] = [];
  for (let g = 1; g <= groupCount; g++) {
    targets.push(base + (remainder > 0 ? 1 : 0));
    remainder--;
  }
  return targets;
}

function compareJoinedAtDesc(a: BalanceRosterRow, b: BalanceRosterRow): number {
  const ja = a.joined_at ?? '';
  const jb = b.joined_at ?? '';
  if (ja !== jb) return ja > jb ? -1 : 1;
  return a.discord_id < b.discord_id ? -1 : a.discord_id > b.discord_id ? 1 : 0;
}

/**
 * Apply order safe for `enforce_event_participant_capacity`: depart fuller groups first.
 * ponytail: static snapshot counts; minimal surplus→deficit plans should not need swaps.
 */
export function sortGroupMovesForApply(
  moves: GroupMovePlan[],
  rows: Array<Pick<GroupMemberRow, 'group_index' | 'waitlisted'>>,
  groupCount: number,
): GroupMovePlan[] {
  const counts = activeCountsByGroup(
    rows
      .filter((r) => !r.waitlisted)
      .map((r) => ({group_index: r.group_index ?? 1, waitlisted: false})),
  );
  for (let g = 1; g <= groupCount; g++) {
    if (!counts.has(g)) counts.set(g, 0);
  }
  return moves.slice().sort((a, b) => {
    const fromA = counts.get(a.from_group) ?? 0;
    const fromB = counts.get(b.from_group) ?? 0;
    if (fromB !== fromA) return fromB - fromA;
    if (a.to_group !== b.to_group) return a.to_group - b.to_group;
    return a.discord_id.localeCompare(b.discord_id);
  });
}

/** Mirrors `enforce_event_participant_capacity` for sequential UPDATE apply order. */
export function canApplyGroupMovesInOrder(
  moves: GroupMovePlan[],
  rows: Array<Pick<BalanceRosterRow, 'discord_id' | 'group_index' | 'waitlisted'>>,
  maxPlayers: number,
): boolean {
  const loc = new Map<string, number>();
  for (const row of rows) {
    if (row.waitlisted) continue;
    loc.set(row.discord_id, row.group_index ?? 1);
  }
  const countInGroup = (group: number, exclude: string | null): number => {
    let n = 0;
    for (const [id, gi] of loc) {
      if (gi === group && id !== exclude) n++;
    }
    return n;
  };
  for (const move of moves) {
    if (countInGroup(move.to_group, move.discord_id) >= maxPlayers) return false;
    loc.set(move.discord_id, move.to_group);
  }
  return true;
}

function finalizeGroupMovePlan(
  moves: GroupMovePlan[],
  active: BalanceRosterRow[],
  groupCount: number,
  maxPlayers: number,
): GroupMovePlan[] {
  if (!moves.length) return [];
  const sorted = sortGroupMovesForApply(
    moves,
    active.map((r) => ({group_index: r.group_index ?? 1, waitlisted: false})),
    groupCount,
  );
  if (!canApplyGroupMovesInOrder(sorted, active, maxPlayers)) return [];
  return sorted;
}

/** Keep convoy leaders fixed; move the fewest drivers from surplus groups into deficit groups. */
export function planGroupBalance(
  rows: BalanceRosterRow[],
  groupCount: number,
  maxPlayers: number,
): GroupMovePlan[] {
  if (groupCount < 2 || maxPlayers < 1) return [];

  const active = rows.filter((r) => !r.waitlisted);
  const counts = activeCountsByGroup(
    active.map((r) => ({group_index: r.group_index ?? 1, waitlisted: false})),
  );
  for (let g = 1; g <= groupCount; g++) {
    if (!counts.has(g)) counts.set(g, 0);
  }

  const totalActive = [...counts.values()].reduce((n, c) => n + c, 0);
  const targets = balancedGroupTargets(totalActive, groupCount);

  type Bucket = {group: number; need: number};
  const surplus: Bucket[] = [];
  const deficit: Bucket[] = [];
  for (let g = 1; g <= groupCount; g++) {
    const cur = counts.get(g) ?? 0;
    const target = targets[g - 1] ?? 0;
    if (cur > target) surplus.push({group: g, need: cur - target});
    else if (cur < target) deficit.push({group: g, need: target - cur});
  }
  if (!surplus.length || !deficit.length) return [];

  surplus.sort((a, b) => b.need - a.need || a.group - b.group);
  deficit.sort((a, b) => b.need - a.need || a.group - b.group);

  const candidatesByGroup = new Map<number, BalanceRosterRow[]>();
  for (const person of active) {
    if (isActiveConvoyLeaderRow(person)) continue;
    const g = person.group_index ?? 1;
    if (g < 1 || g > groupCount) continue;
    const list = candidatesByGroup.get(g) ?? [];
    list.push(person);
    candidatesByGroup.set(g, list);
  }
  for (const list of candidatesByGroup.values()) {
    list.sort(compareJoinedAtDesc);
  }

  const moves: GroupMovePlan[] = [];
  let d = 0;
  for (const src of surplus) {
    let remaining = src.need;
    while (remaining > 0) {
      while (d < deficit.length && deficit[d].need === 0) d++;
      if (d >= deficit.length) break;

      const pool = candidatesByGroup.get(src.group) ?? [];
      const person = pool.shift();
      if (!person) break;

      const toGroup = deficit[d].group;
      const fromGroup = person.group_index ?? 1;
      if (toGroup !== fromGroup) {
        moves.push({discord_id: person.discord_id, from_group: fromGroup, to_group: toGroup});
      }
      remaining--;
      deficit[d].need--;
    }
    if (remaining > 0) return [];
  }
  if (deficit.some((bucket) => bucket.need > 0)) return [];

  return finalizeGroupMovePlan(moves, active, groupCount, maxPlayers);
}

/** Fisher–Yates; `random` returns a value in [0, 1). */
export function shuffleWithRandom<T>(items: T[], random: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function driverSlotsForBalancedTargets(
  active: BalanceRosterRow[],
  targets: number[],
  groupCount: number,
): number[] {
  const leaderCountByGroup = new Map<number, number>();
  for (let g = 1; g <= groupCount; g++) leaderCountByGroup.set(g, 0);
  for (const person of active) {
    if (!isActiveConvoyLeaderRow(person)) continue;
    const g = person.group_index ?? 1;
    if (g >= 1 && g <= groupCount) {
      leaderCountByGroup.set(g, (leaderCountByGroup.get(g) ?? 0) + 1);
    }
  }
  const slots: number[] = [];
  for (let g = 1; g <= groupCount; g++) {
    const driverSlots = Math.max(0, (targets[g - 1] ?? 0) - (leaderCountByGroup.get(g) ?? 0));
    for (let i = 0; i < driverSlots; i++) slots.push(g);
  }
  return slots;
}

/** Randomly assign active non-leaders across groups while keeping leaders and group sizes. */
export function planGroupShuffle(
  rows: BalanceRosterRow[],
  groupCount: number,
  maxPlayers: number,
  random: () => number = Math.random,
): GroupMovePlan[] {
  if (groupCount < 2 || maxPlayers < 1) return [];

  const active = rows.filter((r) => !r.waitlisted);
  const drivers = active.filter((r) => !isActiveConvoyLeaderRow(r));
  if (drivers.length < 2) return [];

  const counts = activeCountsByGroup(
    active.map((r) => ({group_index: r.group_index ?? 1, waitlisted: false})),
  );
  const totalActive = [...counts.values()].reduce((n, c) => n + c, 0);
  const targets = balancedGroupTargets(totalActive, groupCount);
  if (targets.some((t) => t > maxPlayers)) return [];

  const slots = driverSlotsForBalancedTargets(active, targets, groupCount);
  if (slots.length !== drivers.length) return [];

  for (let attempt = 0; attempt < 12; attempt++) {
    const shuffledDrivers = shuffleWithRandom(drivers, random);
    const moves: GroupMovePlan[] = [];
    for (let i = 0; i < shuffledDrivers.length; i++) {
      const person = shuffledDrivers[i];
      const fromGroup = person.group_index ?? 1;
      const toGroup = slots[i];
      if (toGroup !== fromGroup) {
        moves.push({discord_id: person.discord_id, from_group: fromGroup, to_group: toGroup});
      }
    }
    if (moves.length > 0) {
      const plan = finalizeGroupMovePlan(moves, active, groupCount, maxPlayers);
      if (plan.length) return plan;
    }
  }
  return [];
}

function cloneBalanceRows(rows: BalanceRosterRow[]): BalanceRosterRow[] {
  return rows.map((r) => ({...r}));
}

function applyMovesVirtually(rows: BalanceRosterRow[], moves: GroupMovePlan[]): void {
  const byId = new Map(rows.map((r) => [r.discord_id, r]));
  for (const move of moves) {
    const row = byId.get(move.discord_id);
    if (row) row.group_index = move.to_group;
  }
}

/** Collapse multi-hop apply results to one original→final move per racer (for DMs). */
export function netGroupMovePlans(moves: GroupMovePlan[]): GroupMovePlan[] {
  const firstFrom = new Map<string, number>();
  const lastTo = new Map<string, number>();
  for (const move of moves) {
    if (!firstFrom.has(move.discord_id)) firstFrom.set(move.discord_id, move.from_group);
    lastTo.set(move.discord_id, move.to_group);
  }
  const out: GroupMovePlan[] = [];
  for (const [discord_id, to_group] of lastTo) {
    const from_group = firstFrom.get(discord_id);
    if (from_group == null || from_group === to_group) continue;
    out.push({discord_id, from_group, to_group});
  }
  return out;
}

/**
 * Balance, then shuffle — staged apply order (do not re-sort as one list).
 * Returns [] when shuffle after balance is impossible (caller should offer balance alone).
 */
export function planGroupBalanceShuffle(
  rows: BalanceRosterRow[],
  groupCount: number,
  maxPlayers: number,
  random: () => number = Math.random,
): GroupMovePlan[] {
  if (groupCount < 2 || maxPlayers < 1) return [];

  const active = rows.filter((r) => !r.waitlisted);
  const balanceMoves = planGroupBalance(rows, groupCount, maxPlayers);
  if (!balanceMoves.length) return [];

  const afterBalance = cloneBalanceRows(active);
  applyMovesVirtually(afterBalance, balanceMoves);

  for (let attempt = 0; attempt < 12; attempt++) {
    const shuffleMoves = planGroupShuffle(afterBalance, groupCount, maxPlayers, random);
    if (!shuffleMoves.length) continue;
    // Phase 1 then phase 2 — capacity-safe only if order is preserved.
    return [...balanceMoves, ...shuffleMoves];
  }
  return [];
}
