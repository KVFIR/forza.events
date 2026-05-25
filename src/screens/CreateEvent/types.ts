import type {CarRuleMode, EventType} from '../../lib/types';
import type {EventCarEntry} from '../../components/EventCarList';

export type FieldErrors = Partial<Record<string, string>>;

export interface CreateEventFormValues {
  title: string;
  type: EventType;
  startsAtLocal: string;
  description: string;
  coverFile: File | null;
  coverPreview: string | null;
  coverUrl: string | null;
  trackCodes: string[];
  carRuleMode: CarRuleMode;
  maxPi: number;
  additionalCarRestrictions: string;
  eventCars: EventCarEntry[];
  lobbyLeaderIsHost: boolean;
  lobbyLeaderGamertag: string;
  targetGuildId: string;
  targetGuildName: string;
  targetChannelId: string;
}
