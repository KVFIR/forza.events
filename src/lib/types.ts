export type EventType = 'road' | 'dirt' | 'cruise';

export type {ForzaGame} from './eventGames';
import type {ForzaGame} from './eventGames';

export type VoicePolicy = 'required' | 'optional' | 'none';

/** UI-facing registration state */
export type EventStatus = 'open' | 'full' | 'live' | 'ended';

/** Persisted lifecycle from the database */
export type EventLifecycle = 'draft' | 'open' | 'live' | 'completed' | 'cancelled' | 'archived';

export type CarRuleMode = 'anything_goes' | 'restricted_list';

import type {EventTrack} from './eventTracks';

export type {EventTrack};

export interface EventAllowedCar {
  /** `event_cars.id` — unique even when the same catalog car appears twice. */
  id: string;
  /** Catalog `cars.id`. */
  carId: string;
  make: string;
  model: string;
  year?: number | null;
  /** Wiki HUD name when known. */
  abbreviation?: string | null;
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
  /** Global ELO when the driver has at least one rated race. */
  rating?: number;
}

export interface ForzaEvent {
  id: string;
  slug: string;
  title: string;
  type: EventType;
  /** Forza Horizon title (fh5 | fh6). */
  game: ForzaGame;
  status: EventStatus;
  lifecycle: EventLifecycle;
  startsAt: string;
  endsAt?: string;
  createdAt?: string;
  guildId?: string;
  guildName?: string;
  guildIconUrl?: string;
  guildInviteUrl?: string;
  channelId?: string;
  /** Discord gathering voice channel; Join voice on Event Detail / embed. */
  voiceChannelId?: string;
  /** Cached Discord name for that VC (shown as #name). */
  voiceChannelName?: string;
  /** Permanent discord.gg invite for that VC (non-members). */
  voiceInviteUrl?: string;
  /** Set after publish-event posts the Discord embed. */
  discordMessageId?: string;
  carRuleMode: CarRuleMode;
  maxPi: number | null;
  allowedCars: EventAllowedCar[];
  voicePolicy: VoicePolicy;
  /** Capacity **per group**; total lobby capacity = groupCount * maxPlayers. */
  maxPlayers: number;
  /** Number of active lobbies (1..MAX_GROUPS). Defaults to 1 when absent. */
  groupCount?: number;
  /** Opt-in ranked race — finishing positions update global driver ELO. */
  isRanked?: boolean;
  /** True after ranked ELO was applied (or skipped) on submit-results. */
  ratingApplied?: boolean;
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
  /** Per-driver ELO delta after ranked submit (detail select). */
  ratingDeltas?: Record<string, number>;
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
  /** Discord DM notifications about joined/hosted events (default on). */
  dmNotificationsEnabled?: boolean;
  /** Opt-in DMs when any Browse event is published (default off). */
  newEventNotificationsEnabled?: boolean;
  /** Locale for bot DM copy (`en` | `ru`). */
  notificationLocale?: 'en' | 'ru';
  /** Global driver skill rating (ELO). Absent until profile fetch. */
  driverRating?: {
    rating: number;
    gamesRated: number;
    provisional: boolean;
  };
}

export type DiscordGuildOption = {
  id: string;
  name: string;
  iconUrl?: string | null;
};
