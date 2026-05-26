export type EventType = 'road' | 'dirt' | 'drift' | 'touge' | 'cruise';

export type VoicePolicy = 'required' | 'optional' | 'none';

/** UI-facing registration state */
export type EventStatus = 'open' | 'full' | 'live' | 'ended';

/** Persisted lifecycle from the database */
export type EventLifecycle = 'draft' | 'open' | 'live' | 'completed' | 'cancelled' | 'archived';

export type CarRuleMode = 'anything_goes' | 'restricted_list';

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

export interface EventParticipant {
  discordId: string;
  username: string;
  avatarUrl?: string;
  gamertag?: string;
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
  carRuleMode: CarRuleMode;
  maxPi: number;
  allowedCars: EventAllowedCar[];
  voicePolicy: VoicePolicy;
  maxPlayers: number;
  currentPlayers: number;
  hostDiscordId: string;
  hostUsername: string;
  hostAvatarUrl?: string;
  rules: string;
  description?: string;
  coverImageUrl?: string;
  trackCodes?: string[];
  additionalCarRestrictions?: string;
  lobbyLeaderGamertag?: string;
  timezoneHint?: string;
  threadLabel?: string;
  voiceLabel?: string;
  participants: EventParticipant[];
}

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
