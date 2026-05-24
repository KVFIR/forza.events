export type EventType = 'road' | 'dirt' | 'drift' | 'touge';

export type VoicePolicy = 'required' | 'optional' | 'none';

export type EventStatus = 'open' | 'full' | 'live' | 'ended';

export interface EventAllowedCar {
  carId: string;
  make: string;
  model: string;
  year?: number | null;
  pi: number;
  class: string;
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
  startsAt: string;
  endsAt?: string;
  createdAt?: string;
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
  /** Event share codes (000 000 000), one per track/round. */
  trackList?: string[];
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
