import {
  planGroupBalance,
  planGroupShuffle,
  type BalanceRosterRow,
} from '@edge/eventGroups.ts';
import type {GroupRosterMode} from './api';
import type {ForzaEvent} from './types';

function toBalanceRows(
  event: Pick<ForzaEvent, 'participants'>,
): BalanceRosterRow[] {
  return event.participants.map((p) => ({
    discord_id: p.discordId,
    group_index: p.groupIndex ?? 1,
    waitlisted: p.waitlisted ?? false,
    is_convoy_leader: p.isConvoyLeader ?? false,
    joined_at: p.joinedAt ?? null,
  }));
}

export function planGroupRosterMoves(
  event: Pick<ForzaEvent, 'groupCount' | 'maxPlayers' | 'participants'>,
  mode: GroupRosterMode,
) {
  const groupCount = event.groupCount ?? 1;
  const rows = toBalanceRows(event);
  return mode === 'shuffle'
    ? planGroupShuffle(rows, groupCount, event.maxPlayers)
    : planGroupBalance(rows, groupCount, event.maxPlayers);
}

export function groupRosterWouldChange(
  event: Pick<ForzaEvent, 'groupCount' | 'maxPlayers' | 'participants'>,
  mode: GroupRosterMode,
): boolean {
  return planGroupRosterMoves(event, mode).length > 0;
}
