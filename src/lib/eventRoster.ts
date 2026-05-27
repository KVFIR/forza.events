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
    | 'lobbyLeaderDiscordId'
    | 'hostDiscordId'
    | 'hostUsername'
    | 'hostAvatarUrl'
    | 'participants'
  >,
  viewerDiscordId: string,
  viewerGamertag?: string | null,
): RosterConvoyLeader | null {
  const gamertag = event.lobbyLeaderGamertag?.trim();
  if (!gamertag) return null;

  if (event.lobbyLeaderDiscordId) {
    const isHostLeader = event.lobbyLeaderDiscordId === event.hostDiscordId;
    const participant = event.participants?.find(
      (p) => p.discordId === event.lobbyLeaderDiscordId,
    );
    return {
      gamertag,
      discordId: event.lobbyLeaderDiscordId,
      username: isHostLeader ? event.hostUsername : participant?.username,
      avatarUrl: isHostLeader ? event.hostAvatarUrl : participant?.avatarUrl,
      isYou: viewerDiscordId === event.lobbyLeaderDiscordId,
    };
  }

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

/**
 * Everyone who can appear in submitted results: joined drivers plus convoy leader when we know their Discord id.
 * The host convoy leader races but cannot use Join — they are included here by host_discord_id.
 */
export function resolveResultsRoster(
  event: Pick<
    ForzaEvent,
    | 'participants'
    | 'lobbyLeaderGamertag'
    | 'lobbyLeaderIsHost'
    | 'lobbyLeaderDiscordId'
    | 'hostDiscordId'
    | 'hostUsername'
    | 'hostAvatarUrl'
    | 'participants'
  >,
  viewerDiscordId: string,
  viewerGamertag?: string | null,
): EventParticipant[] {
  const convoy = resolveConvoyLeader(event, viewerDiscordId, viewerGamertag);
  const drivers = [...event.participants];

  if (convoy?.discordId && !drivers.some((p) => p.discordId === convoy.discordId)) {
    drivers.unshift({
      discordId: convoy.discordId,
      username: convoy.username ?? convoy.gamertag,
      gamertag: convoy.gamertag,
      avatarUrl: convoy.avatarUrl,
    });
  }

  return drivers;
}
