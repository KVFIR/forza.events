export type EventType = 'road' | 'dirt' | 'cruise';

export type VoicePolicy = 'required' | 'optional' | 'none';

/** UI-facing registration state */
export type EventStatus = 'open' | 'full' | 'live' | 'ended';

/** Persisted lifecycle from the database */
export type EventLifecycle = 'draft' | 'open' | 'live' | 'completed' | 'cancelled' | 'archived';

export type CarRuleMode = 'anything_goes' | 'restricted_list';

import type {EventTrack} from './eventTracks';

export type {EventTrack};

export interface EventAllowedCar {
  carId: string;
  make: string;
  model: string;
  year?: number | null;
  pi: number;
  maxPi: number;
  tuneShareCode?: string;
  restrictions: string[];
}

export type ParticipationSource = 'self_join' | 'host_assigned' | 'host_self_assigned';

export interface EventParticipant {
  discordId: string;
  username: string;
  avatarUrl?: string;
  gamertag?: string;
  isConvoyLeader?: boolean;
  participationSource?: ParticipationSource;
  /** Lobby group (1..groupCount); meaningful only when not waitlisted. */
  groupIndex?: number;
  /** True while queued because every active group is full. */
  waitlisted?: boolean;
  /** Queue ordering — oldest first when waitlisted. */
  joinedAt?: string;
}

export interface ForzaEvent {
  id: string;
  slug: string;
  title: string;
  type: EventType;
  status: EventStatus;
  lifecycle: EventLifecycle;
  startsAt: string;
  endsAt?: string;
  createdAt?: string;
  guildId?: string;
  guildName?: string;
  channelId?: string;
  /** Set after publish-event posts the Discord embed. */
  discordMessageId?: string;
  carRuleMode: CarRuleMode;
  maxPi: number;
  allowedCars: EventAllowedCar[];
  voicePolicy: VoicePolicy;
  /** Capacity **per group**; total lobby capacity = groupCount * maxPlayers. */
  maxPlayers: number;
  /** Number of active lobbies (1..MAX_GROUPS). Defaults to 1 when absent. */
  groupCount?: number;
  currentPlayers: number;
  hostDiscordId: string;
  hostUsername: string;
  hostAvatarUrl?: string;
  rules: string;
  description?: string;
  coverImageUrl?: string;
  tracks?: EventTrack[];
  additionalCarRestrictions?: string;
  lobbyLeaderGamertag?: string;
  /** Set when convoy leader is chosen from the server roster (or host). */
  lobbyLeaderDiscordId?: string;
  /** When true (default), convoy leader is the host; shown in roster, not only via Join. */
  lobbyLeaderIsHost?: boolean;
  timezoneHint?: string;
  threadLabel?: string;
  voiceLabel?: string;
  participants: EventParticipant[];
  /** Present when loaded via event-detail select (PostgREST or browse-events by id). */
  publishedResults?: PublishedEventResultRow[];
}

export type PublishedEventResultRow = {
  discordId: string;
  position: number | null;
  dnf: boolean;
  dns: boolean;
  points?: number | null;
  groupIndex?: number;
};

export interface AppUser {
  discordId: string;
  username: string;
  avatarUrl?: string;
  xboxGamertag?: string;
  eventsJoined: number;
  eventsHosted: number;
  attendanceRate: number;
  noShows: number;
  hostRatingAvg: number;
}

export type DiscordGuildOption = {
  id: string;
  name: string;
  iconUrl?: string | null;
};
