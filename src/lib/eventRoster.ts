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
): EventParticipant | undefined {
  return participants.find((p) => p.isConvoyLeader);
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

export function resolveConvoyLeader(
  event: Pick<
    ForzaEvent,
    | 'participants'
    | 'hostDiscordId'
    | 'hostUsername'
    | 'hostAvatarUrl'
    | 'lobbyLeaderGamertag'
    | 'lobbyLeaderDiscordId'
    | 'lobbyLeaderIsHost'
  >,
  viewerDiscordId: string,
): RosterConvoyLeader | null {
  const leader = findConvoyLeaderParticipant(event.participants);
  if (leader) {
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

/** Registered drivers excluding convoy leader row (shown separately in UI). */
export function resolveRegisteredDrivers(
  participants: EventParticipant[],
): EventParticipant[] {
  return participants.filter((p) => !p.isConvoyLeader);
}

/** All participants eligible for results (one row per racer). */
export function resolveResultsRoster(
  event: Pick<ForzaEvent, 'participants'>,
): EventParticipant[] {
  return [...event.participants];
}
