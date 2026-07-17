import {compareWaitlistParticipants} from './eventRoster';
import {firstOpenGroupIndex, lobbyIsFull, totalCapacity} from './eventSpec';
import type {AppUser, EventParticipant, ForzaEvent} from './types';

export type ParticipationUserSnapshot = Pick<AppUser, 'discordId' | 'username' | 'avatarUrl'>;

export type JoinServerResponse = {
  joined: boolean;
  waitlisted?: boolean;
  group_index?: number;
};

/** Lobby fields applied optimistically before the server round-trip completes. */
export type EventLobbyPatch = Pick<ForzaEvent, 'currentPlayers' | 'participants'>;

export function toEventLobbyPatch(event: ForzaEvent): EventLobbyPatch {
  return {
    currentPlayers: event.currentPlayers,
    participants: event.participants,
  };
}

/** Merge a pending lobby patch into a catalog or detail event row. */
export function mergeOptimisticEventPatch(
  event: ForzaEvent,
  patch: EventLobbyPatch | undefined,
): ForzaEvent {
  if (!patch) return event;
  return {
    ...event,
    currentPlayers: patch.currentPlayers,
    participants: patch.participants,
  };
}

function addsLobbySeat(
  existing: EventParticipant | undefined,
  participationSource: ParticipationSource,
): boolean {
  return existing === undefined && participationSource === 'self_join';
}

type ParticipationSource = EventParticipant['participationSource'];

/** Reconcile optimistic join state with the server response. */
export function applyJoinServerResponse(
  event: ForzaEvent,
  discordId: string,
  response: JoinServerResponse,
): ForzaEvent {
  const idx = event.participants.findIndex((p) => p.discordId === discordId);
  if (idx < 0) return event;

  const waitlisted = response.waitlisted ?? !response.joined;
  const groupIndex = response.group_index ?? event.participants[idx]?.groupIndex ?? 1;
  const participants = event.participants.map((p, i) =>
    i === idx ? {...p, waitlisted, groupIndex} : p,
  );
  return {...event, participants};
}

/** Optimistic event row after the current user joins (before refetch). */
export function patchEventAfterSelfJoin(
  event: ForzaEvent,
  user: ParticipationUserSnapshot,
  gamertag: string,
): ForzaEvent {
  const discordId = user.discordId;
  if (!discordId) return event;

  const gt = gamertag.trim();
  const existingIdx = event.participants.findIndex((p) => p.discordId === discordId);
  const existing = existingIdx >= 0 ? event.participants[existingIdx] : undefined;

  if (existing?.participationSource === 'self_join' && !existing.waitlisted) {
    return event;
  }

  const participationSource: ParticipationSource =
    existing?.participationSource === 'host_assigned' ||
    existing?.participationSource === 'host_self_assigned'
      ? existing.participationSource
      : 'self_join';

  // Route into the smallest open group, or the waitlist when the lobby is full.
  const alreadyActive = existing !== undefined && !existing.waitlisted;
  const waitlisted = alreadyActive ? false : lobbyIsFull(event);
  const openGroup = waitlisted ? null : firstOpenGroupIndex(event);
  const groupIndex = alreadyActive
    ? existing.groupIndex ?? 1
    : openGroup ?? existing?.groupIndex ?? 1;

  const nextParticipant: EventParticipant = {
    discordId,
    username: user.username,
    avatarUrl: user.avatarUrl,
    gamertag: gt,
    isConvoyLeader: existing?.isConvoyLeader ?? false,
    participationSource,
    groupIndex,
    waitlisted,
    joinedAt: existing?.joinedAt ?? new Date().toISOString(),
  };

  const participants =
    existingIdx >= 0
      ? event.participants.map((p, i) => (i === existingIdx ? nextParticipant : p))
      : [...event.participants, nextParticipant];

  const takesSeat = !waitlisted && addsLobbySeat(existing, participationSource);
  const currentPlayers = takesSeat
    ? Math.min(totalCapacity(event), event.currentPlayers + 1)
    : event.currentPlayers;

  return {
    ...event,
    participants,
    currentPlayers,
  };
}

/** Optimistic event row after the current user leaves (before refetch). */
export function patchEventAfterSelfLeave(event: ForzaEvent, discordId: string): ForzaEvent {
  const leaving = discordId
    ? event.participants.find((p) => p.discordId === discordId)
    : undefined;
  if (!leaving) return event;

  const freesSeat = !leaving.waitlisted;
  let participants = event.participants.filter((p) => p.discordId !== discordId);
  let currentPlayers = freesSeat ? Math.max(0, event.currentPlayers - 1) : event.currentPlayers;

  if (freesSeat) {
    const groupIndex = leaving.groupIndex ?? 1;
    const waitlist = participants.filter((p) => p.waitlisted).sort(compareWaitlistParticipants);
    const next = waitlist[0];
    if (next) {
      participants = participants.map((p) =>
        p.discordId === next.discordId
          ? {...p, waitlisted: false, groupIndex}
          : p,
      );
      currentPlayers += 1;
    }
  }

  return {...event, participants, currentPlayers};
}
