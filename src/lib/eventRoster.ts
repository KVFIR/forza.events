import type {EventParticipant, ForzaEvent} from './types';

export type RosterConvoyLeader = {
  gamertag: string;
  discordId?: string;
  username?: string;
  avatarUrl?: string;
  isYou: boolean;
};

export function resolveConvoyLeader(
  event: Pick<
    ForzaEvent,
    | 'lobbyLeaderGamertag'
    | 'lobbyLeaderIsHost'
    | 'hostDiscordId'
    | 'hostUsername'
    | 'hostAvatarUrl'
  >,
  viewerDiscordId: string,
  viewerGamertag?: string | null,
): RosterConvoyLeader | null {
  const gamertag = event.lobbyLeaderGamertag?.trim();
  if (!gamertag) return null;

  if (event.lobbyLeaderIsHost !== false) {
    return {
      gamertag,
      discordId: event.hostDiscordId,
      username: event.hostUsername,
      avatarUrl: event.hostAvatarUrl,
      isYou: viewerDiscordId === event.hostDiscordId,
    };
  }

  const viewerTag = viewerGamertag?.trim();
  return {
    gamertag,
    isYou: Boolean(
      viewerTag && viewerTag.toLowerCase() === gamertag.toLowerCase(),
    ),
  };
}

/** Registered drivers only — convoy leader is shown separately when they are the host. */
export function resolveRegisteredDrivers(
  event: Pick<ForzaEvent, 'participants' | 'lobbyLeaderIsHost'>,
  convoy: RosterConvoyLeader | null,
): EventParticipant[] {
  if (!convoy?.discordId || event.lobbyLeaderIsHost === false) {
    return event.participants;
  }
  return event.participants.filter((p) => p.discordId !== convoy.discordId);
}
