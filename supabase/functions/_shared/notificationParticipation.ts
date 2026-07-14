import {firstOpenGroup, type GroupMemberRow} from './eventGroups.ts';

type RosterDiscordRow = {
  discord_id: string;
  group_index?: number | null;
  waitlisted?: boolean | null;
};

/** True when a join assigns a new active (non-waitlist) seat — not a gamertag re-upsert. */
export function joinedNewActiveSeat(
  existing: {waitlisted?: boolean | null} | undefined,
  waitlistedAfterJoin: boolean,
): boolean {
  if (waitlistedAfterJoin) return false;
  return !existing || Boolean(existing.waitlisted);
}

/** Active racers in group G excluding `excludeDiscordId` (pre-upsert roster). */
export function activeCountInGroupExcluding(
  roster: {discord_id: string; group_index?: number | null; waitlisted?: boolean | null}[],
  groupIndex: number,
  excludeDiscordId: string,
): number {
  return roster.filter(
    (r) =>
      !r.waitlisted &&
      (r.group_index ?? 1) === groupIndex &&
      r.discord_id !== excludeDiscordId,
  ).length;
}

/** Post-leave promote roster already includes the promoted racer. */
export function groupFillsOnPromote(
  roster: {group_index?: number | null; waitlisted?: boolean | null}[],
  groupIndex: number,
  maxPlayers: number,
): boolean {
  const count = roster.filter(
    (r) => !r.waitlisted && (r.group_index ?? 1) === groupIndex,
  ).length;
  return count >= maxPlayers;
}

export function groupFillsOnJoin(
  existing: {waitlisted?: boolean | null} | undefined,
  waitlistedAfterJoin: boolean,
  roster: {discord_id: string; group_index?: number | null; waitlisted?: boolean | null}[],
  groupIndex: number,
  joinerDiscordId: string,
  maxPlayers: number,
): boolean {
  if (!joinedNewActiveSeat(existing, waitlistedAfterJoin)) return false;
  const afterCount = activeCountInGroupExcluding(roster, groupIndex, joinerDiscordId) + 1;
  return afterCount >= maxPlayers;
}

function rosterAfterActiveJoin(
  roster: RosterDiscordRow[],
  joinerDiscordId: string,
  groupIndex: number,
): GroupMemberRow[] {
  const existing = roster.find((r) => r.discord_id === joinerDiscordId);
  if (existing) {
    return roster.map((r) =>
      r.discord_id === joinerDiscordId
        ? {group_index: groupIndex, waitlisted: false}
        : {group_index: r.group_index ?? 1, waitlisted: r.waitlisted ?? false},
    );
  }
  return [
    ...roster.map((r) => ({
      group_index: r.group_index ?? 1,
      waitlisted: r.waitlisted ?? false,
    })),
    {group_index: groupIndex, waitlisted: false},
  ];
}

/** Host DM only when a group hits capacity and no other group still has open seats. */
export function shouldEnqueueHostGroupFilledOnJoin(
  existing: {waitlisted?: boolean | null} | undefined,
  waitlistedAfterJoin: boolean,
  roster: RosterDiscordRow[],
  groupIndex: number,
  joinerDiscordId: string,
  maxPlayers: number,
  groupCount: number,
): boolean {
  if (!groupFillsOnJoin(existing, waitlistedAfterJoin, roster, groupIndex, joinerDiscordId, maxPlayers)) {
    return false;
  }
  const after = rosterAfterActiveJoin(roster, joinerDiscordId, groupIndex);
  return firstOpenGroup(after, groupCount, maxPlayers) === null;
}

export function shouldEnqueueHostGroupFilledOnPromote(
  roster: GroupMemberRow[],
  groupIndex: number,
  maxPlayers: number,
  groupCount: number,
): boolean {
  if (!groupFillsOnPromote(roster, groupIndex, maxPlayers)) return false;
  return firstOpenGroup(roster, groupCount, maxPlayers) === null;
}
