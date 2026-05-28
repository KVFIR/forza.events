import type {AppUser, EventParticipant, ForzaEvent} from './types';

export type ParticipationUserSnapshot = Pick<AppUser, 'discordId' | 'username' | 'avatarUrl'>;

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

  if (existing?.participationSource === 'self_join') {
    return event;
  }

  const participationSource: ParticipationSource =
    existing?.participationSource === 'host_assigned' ||
    existing?.participationSource === 'host_self_assigned'
      ? existing.participationSource
      : 'self_join';

  const nextParticipant: EventParticipant = {
    discordId,
    username: user.username,
    avatarUrl: user.avatarUrl,
    gamertag: gt,
    isConvoyLeader: existing?.isConvoyLeader ?? false,
    participationSource,
  };

  const participants =
    existingIdx >= 0
      ? event.participants.map((p, i) => (i === existingIdx ? nextParticipant : p))
      : [...event.participants, nextParticipant];

  const currentPlayers = addsLobbySeat(existing, participationSource)
    ? Math.min(event.maxPlayers, event.currentPlayers + 1)
    : event.currentPlayers;

  return {
    ...event,
    participants,
    currentPlayers,
  };
}

/** Optimistic event row after the current user leaves (before refetch). */
export function patchEventAfterSelfLeave(event: ForzaEvent, discordId: string): ForzaEvent {
  if (!discordId || !event.participants.some((p) => p.discordId === discordId)) {
    return event;
  }
  return {
    ...event,
    participants: event.participants.filter((p) => p.discordId !== discordId),
    currentPlayers: Math.max(0, event.currentPlayers - 1),
  };
}
