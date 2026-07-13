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
