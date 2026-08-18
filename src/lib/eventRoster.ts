import type {EventParticipant, ForzaEvent, ParticipationSource} from './types';

export type RosterConvoyLeader = {
  gamertag: string;
  discordId: string;
  username?: string;
  avatarUrl?: string;
  isYou: boolean;
  participationSource?: ParticipationSource;
  rating?: number;
};

export function findConvoyLeaderParticipant(
  participants: EventParticipant[],
  groupIndex = 1,
): EventParticipant | undefined {
  return participants.find((p) => p.isConvoyLeader && (p.groupIndex ?? 1) === groupIndex);
}

function resolveDiscordUsername(
  event: Pick<ForzaEvent, 'participants' | 'hostDiscordId' | 'hostUsername'>,
  discordId: string,
): string {
  if (discordId === event.hostDiscordId) {
    return event.hostUsername.trim();
  }
  return event.participants.find((p) => p.discordId === discordId)?.username?.trim() ?? '';
}

type RosterEvent = Pick<
  ForzaEvent,
  | 'participants'
  | 'hostDiscordId'
  | 'hostUsername'
  | 'hostAvatarUrl'
  | 'lobbyLeaderGamertag'
  | 'lobbyLeaderDiscordId'
  | 'lobbyLeaderIsHost'
>;

function rosterLeaderFromParticipant(
  event: Pick<ForzaEvent, 'participants' | 'hostDiscordId' | 'hostUsername' | 'hostAvatarUrl'>,
  leader: EventParticipant,
  viewerDiscordId: string,
): RosterConvoyLeader | null {
  const gamertag = leader.gamertag?.trim();
  if (!gamertag) return null;
  const isHostLeader = leader.discordId === event.hostDiscordId;
  return {
    gamertag,
    discordId: leader.discordId,
    username: resolveDiscordUsername(event, leader.discordId),
    avatarUrl: isHostLeader ? event.hostAvatarUrl : leader.avatarUrl,
    isYou: viewerDiscordId === leader.discordId,
    participationSource: leader.participationSource,
    rating: leader.rating,
  };
}

export function resolveConvoyLeader(
  event: RosterEvent,
  viewerDiscordId: string,
): RosterConvoyLeader | null {
  const leader = findConvoyLeaderParticipant(event.participants);
  if (leader) {
    return rosterLeaderFromParticipant(event, leader, viewerDiscordId);
  }

  const gamertag = event.lobbyLeaderGamertag?.trim();
  if (!gamertag) return null;

  const discordId =
    event.lobbyLeaderDiscordId ??
    (event.lobbyLeaderIsHost !== false ? event.hostDiscordId : undefined);
  if (!discordId) return null;

  const isHostLeader = discordId === event.hostDiscordId;
  const leaderRow = event.participants.find((p) => p.discordId === discordId);

  return {
    gamertag,
    discordId,
    username: resolveDiscordUsername(event, discordId),
    avatarUrl: isHostLeader ? event.hostAvatarUrl : leaderRow?.avatarUrl,
    isYou: viewerDiscordId === discordId,
    participationSource: isHostLeader ? 'host_self_assigned' : 'host_assigned',
    rating: leaderRow?.rating,
  };
}

/** Registered drivers excluding convoy leaders and the waitlist (shown separately in UI). */
export function resolveRegisteredDrivers(
  participants: EventParticipant[],
): EventParticipant[] {
  return sortParticipantsByJoinedAt(
    participants.filter((p) => !p.isConvoyLeader && !p.waitlisted),
  );
}

export type RosterGroup = {
  groupIndex: number;
  leader: RosterConvoyLeader | null;
  drivers: EventParticipant[];
};

/** Roster split into per-group sections (group 1 keeps the denormalized host fallback). */
export function resolveEventGroups(
  event: RosterEvent & Pick<ForzaEvent, 'groupCount'>,
  viewerDiscordId: string,
): RosterGroup[] {
  const count = Math.max(1, event.groupCount ?? 1);
  const groups: RosterGroup[] = [];
  for (let g = 1; g <= count; g++) {
    const leaderPart = findConvoyLeaderParticipant(event.participants, g);
    const leader =
      g === 1
        ? resolveConvoyLeader(event, viewerDiscordId)
        : leaderPart
          ? rosterLeaderFromParticipant(event, leaderPart, viewerDiscordId)
          : null;
    const drivers = sortParticipantsByJoinedAt(
      event.participants.filter(
        (p) => !p.waitlisted && !p.isConvoyLeader && (p.groupIndex ?? 1) === g,
      ),
    );
    groups.push({groupIndex: g, leader, drivers});
  }
  return groups;
}

/** Registration order — matches server waitlist promotion (`joined_at`, then `discord_id`). */
export function compareParticipantsByJoinedAt(
  a: EventParticipant,
  b: EventParticipant,
): number {
  const ta = a.joinedAt ?? '';
  const tb = b.joinedAt ?? '';
  if (ta !== tb) return ta.localeCompare(tb);
  return a.discordId.localeCompare(b.discordId);
}

/** @deprecated Use compareParticipantsByJoinedAt */
export const compareWaitlistParticipants = compareParticipantsByJoinedAt;

export function sortParticipantsByJoinedAt(
  participants: EventParticipant[],
): EventParticipant[] {
  return [...participants].sort(compareParticipantsByJoinedAt);
}

/** Queue of waitlisted racers, oldest first (matches server promotion order). */
export function resolveWaitlist(participants: EventParticipant[]): EventParticipant[] {
  return sortParticipantsByJoinedAt(participants.filter((p) => p.waitlisted));
}

export type AddGroupLeaderCandidate = {
  discordId: string;
  username: string;
  gamertag: string | null;
  avatarUrl?: string | null;
};

/** Host is eligible when they are not an active convoy leader in any group. */
export function hostCanLeadNewGroup(
  event: Pick<
    ForzaEvent,
    | 'hostDiscordId'
    | 'participants'
    | 'lobbyLeaderGamertag'
    | 'lobbyLeaderDiscordId'
    | 'lobbyLeaderIsHost'
  >,
): boolean {
  if (!event.hostDiscordId) return false;
  if (
    event.participants.some(
      (p) =>
        p.discordId === event.hostDiscordId && p.isConvoyLeader && !p.waitlisted,
    )
  ) {
    return false;
  }
  const gt = event.lobbyLeaderGamertag?.trim();
  if (!gt || event.lobbyLeaderIsHost === false) return true;
  const leaderId = event.lobbyLeaderDiscordId?.trim() || event.hostDiscordId;
  return leaderId !== event.hostDiscordId;
}

/** Free seat after swap when host-assigned leader row is removed; self_join demote keeps count. */
export function groupHasSeatForIncomingLeader(
  event: Pick<ForzaEvent, 'participants' | 'maxPlayers'>,
  groupIndex: number,
): boolean {
  const inGroup = event.participants.filter(
    (p) => !p.waitlisted && (p.groupIndex ?? 1) === groupIndex,
  );
  let count = inGroup.length;
  const leader = inGroup.find((p) => p.isConvoyLeader);
  if (leader && leader.participationSource !== 'self_join') {
    count -= 1;
  }
  return count < event.maxPlayers;
}

/** Change-leader picker: same pool as add-group, minus waitlist / outsiders when the group has no seat. */
export function buildChangeGroupLeaderCandidates(
  event: Pick<
    ForzaEvent,
    'hostDiscordId' | 'hostUsername' | 'hostAvatarUrl' | 'participants' | 'maxPlayers'
  >,
  waitlist: EventParticipant[],
  groupIndex: number,
): AddGroupLeaderCandidate[] {
  const hasSeat = groupHasSeatForIncomingLeader(event, groupIndex);
  return buildAddGroupLeaderCandidates(event, waitlist).filter((c) => {
    const row = event.participants.find((p) => p.discordId === c.discordId);
    if (row && !row.waitlisted && (row.groupIndex ?? 1) === groupIndex) {
      return true;
    }
    return hasSeat;
  });
}

/** Quick-pick list for Add group: waitlist, active non-leaders, then host when eligible. */
export function buildAddGroupLeaderCandidates(
  event: Pick<
    ForzaEvent,
    'hostDiscordId' | 'hostUsername' | 'hostAvatarUrl' | 'participants'
  >,
  waitlist: EventParticipant[],
): AddGroupLeaderCandidate[] {
  const seen = new Set<string>();
  const out: AddGroupLeaderCandidate[] = [];
  const push = (candidate: AddGroupLeaderCandidate) => {
    if (seen.has(candidate.discordId)) return;
    seen.add(candidate.discordId);
    out.push(candidate);
  };

  for (const p of waitlist) {
    push({
      discordId: p.discordId,
      username: p.username,
      gamertag: p.gamertag ?? null,
      avatarUrl: p.avatarUrl,
    });
  }

  for (const p of sortParticipantsByJoinedAt(
    event.participants.filter((row) => !row.waitlisted && !row.isConvoyLeader),
  )) {
    push({
      discordId: p.discordId,
      username: p.username,
      gamertag: p.gamertag ?? null,
      avatarUrl: p.avatarUrl,
    });
  }

  if (hostCanLeadNewGroup(event)) {
    push({
      discordId: event.hostDiscordId,
      username: event.hostUsername,
      gamertag: null,
      avatarUrl: event.hostAvatarUrl,
    });
  }

  return out;
}

/** Active (non-waitlisted) racers for results entry. Host may add waitlisted / guild guests on submit. */
export function resolveResultsRoster(
  event: Pick<ForzaEvent, 'participants'>,
): EventParticipant[] {
  return sortParticipantsByJoinedAt(event.participants.filter((p) => !p.waitlisted));
}

/** Convoy leader for a specific lobby group (group 1 keeps denormalized host fallback). */
export function resolveGroupConvoyLeader(
  event: RosterEvent & Pick<ForzaEvent, 'groupCount'>,
  groupIndex: number,
  viewerDiscordId: string,
): RosterConvoyLeader | null {
  if (groupIndex === 1) return resolveConvoyLeader(event, viewerDiscordId);
  const leaderPart = findConvoyLeaderParticipant(event.participants, groupIndex);
  return leaderPart ? rosterLeaderFromParticipant(event, leaderPart, viewerDiscordId) : null;
}

/** True when the viewer is an active (non-waitlisted) convoy leader in any group. */
export function viewerIsConvoyLeader(
  event: Pick<ForzaEvent, 'participants'>,
  viewerDiscordId: string,
): boolean {
  if (!viewerDiscordId) return false;
  const row = event.participants.find((p) => p.discordId === viewerDiscordId);
  return Boolean(row?.isConvoyLeader && !row.waitlisted);
}

/** Convoy leader for the viewer's active group — null while waitlisted or not in roster. */
export function resolveViewerConvoyLeader(
  event: RosterEvent & Pick<ForzaEvent, 'groupCount'>,
  viewerDiscordId: string,
): RosterConvoyLeader | null {
  if (!viewerDiscordId) return null;
  const row = event.participants.find((p) => p.discordId === viewerDiscordId);
  if (!row || row.waitlisted) return null;
  return resolveGroupConvoyLeader(event, row.groupIndex ?? 1, viewerDiscordId);
}
