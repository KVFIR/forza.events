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

export function resolveConvoyLeader(
  event: Pick<ForzaEvent, 'participants' | 'hostDiscordId' | 'hostUsername' | 'hostAvatarUrl'>,
  viewerDiscordId: string,
): RosterConvoyLeader | null {
  const leader = findConvoyLeaderParticipant(event.participants);
  if (!leader) return null;

  const gamertag = leader.gamertag?.trim();
  if (!gamertag) return null;

  const isHostLeader = leader.discordId === event.hostDiscordId;

  return {
    gamertag,
    discordId: leader.discordId,
    username: isHostLeader ? event.hostUsername : leader.username,
    avatarUrl: isHostLeader ? event.hostAvatarUrl : leader.avatarUrl,
    isYou: viewerDiscordId === leader.discordId,
    participationSource: leader.participationSource,
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
