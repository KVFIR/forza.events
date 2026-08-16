import type {CarRuleMode, EventTrack, EventType} from '../../lib/types';
import type {ForzaGame} from '../../lib/eventGames';
import type {EventCarEntry} from '../../components/EventCarList';

export type FieldErrors = Partial<Record<string, string>>;

/** Empty until the host picks a type on create. */
export type CreateEventType = EventType | '';

export interface CreateEventFormValues {
  title: string;
  type: CreateEventType;
  game: ForzaGame;
  startsAtLocal: string;
  description: string;
  coverFile: File | null;
  coverPreview: string | null;
  coverUrl: string | null;
  tracks: EventTrack[];
  carRuleMode: CarRuleMode;
  maxPi: number | null;
  additionalCarRestrictions: string;
  eventCars: EventCarEntry[];
  lobbyLeaderIsHost: boolean;
  lobbyLeaderGamertag: string;
  lobbyLeaderDiscordId: string | null;
  lobbyLeaderUsername: string;
  targetGuildId: string;
  targetGuildName: string;
  targetChannelId: string;
  targetVoiceChannelId: string;
  /** Ranked race (global ELO); only meaningful on allowlisted guilds. */
  isRanked: boolean;
  /** From list-guilds for the selected target guild. */
  targetGuildRatingEnabled: boolean;
}
