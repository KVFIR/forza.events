import type {EventParticipant, ForzaEvent, ParticipationSource} from './types';

export type RosterConvoyLeader = {
  gamertag: string;
  discordId: string;
  username?: string;
  avatarUrl?: string;
  isYou: boolean;
  participationSource?: ParticipationSource;
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

/** All participants eligible for results (one row per racer; waitlisted never raced). */
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
