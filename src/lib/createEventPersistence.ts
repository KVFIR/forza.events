import type {EventTrack} from './types';
import type {CarRuleMode, EventType} from './types';
import type {EventCarEntry} from '../components/EventCarList';
import type {CreateEventStepIndex} from '../screens/CreateEvent/constants';

export const CREATE_EVENT_WIP_STORAGE_KEY = 'forza.create.wip';

export type CreateEventType = EventType | '';

export type CreateEventFormSnapshot = {
  step: CreateEventStepIndex;
  eventId: string | null;
  title: string;
  type: CreateEventType;
  startsAtLocal: string;
  description: string;
  coverUrl: string | null;
  coverPreview: string | null;
  pendingCover: boolean;
  tracks: EventTrack[];
  carRuleMode: CarRuleMode;
  maxPi: number;
  additionalCarRestrictions: string;
  eventCars: EventCarEntry[];
  lobbyLeaderIsHost: boolean;
  lobbyLeaderGamertag: string;
  lobbyLeaderDiscordId: string | null;
  lobbyLeaderUsername: string;
  lobbyLeaderProfileGamertag: string | null;
  targetGuildId: string;
  targetGuildName: string;
  targetChannelId: string;
};

export type CreateEventWipPayload = CreateEventFormSnapshot & {
  v: 1;
  savedAt: string;
};

export type DraftSyncStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export function snapshotFromForm(input: {
  step: CreateEventStepIndex;
  eventId: string | null;
  title: string;
  type: CreateEventType;
  startsAtLocal: string;
  description: string;
  coverFile: File | null;
  coverPreview: string | null;
  coverUrl: string | null;
  tracks: EventTrack[];
  carRuleMode: CarRuleMode;
  maxPi: number;
  additionalCarRestrictions: string;
  eventCars: EventCarEntry[];
  lobbyLeaderIsHost: boolean;
  lobbyLeaderGamertag: string;
  lobbyLeaderDiscordId: string | null;
  lobbyLeaderUsername: string;
  lobbyLeaderProfileGamertag: string | null;
  targetGuildId: string;
  targetGuildName: string;
  targetChannelId: string;
}): CreateEventFormSnapshot {
  const coverPreview =
    input.coverPreview && !input.coverPreview.startsWith('blob:')
      ? input.coverPreview
      : input.coverUrl;

  return {
    step: input.step,
    eventId: input.eventId,
    title: input.title,
    type: input.type,
    startsAtLocal: input.startsAtLocal,
    description: input.description,
    coverUrl: input.coverUrl,
    coverPreview,
    pendingCover: Boolean(input.coverFile),
    tracks: input.tracks,
    carRuleMode: input.carRuleMode,
    maxPi: input.maxPi,
    additionalCarRestrictions: input.additionalCarRestrictions,
    eventCars: input.eventCars,
    lobbyLeaderIsHost: input.lobbyLeaderIsHost,
    lobbyLeaderGamertag: input.lobbyLeaderGamertag,
    lobbyLeaderDiscordId: input.lobbyLeaderDiscordId,
    lobbyLeaderUsername: input.lobbyLeaderUsername,
    lobbyLeaderProfileGamertag: input.lobbyLeaderProfileGamertag,
    targetGuildId: input.targetGuildId,
    targetGuildName: input.targetGuildName,
    targetChannelId: input.targetChannelId,
  };
}

export function snapshotsEqual(a: CreateEventFormSnapshot, b: CreateEventFormSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function hasMeaningfulCreateProgress(snapshot: CreateEventFormSnapshot): boolean {
  return (
    Boolean(snapshot.title.trim()) ||
    Boolean(snapshot.type) ||
    Boolean(snapshot.startsAtLocal.trim()) ||
    Boolean(snapshot.description.trim()) ||
    snapshot.tracks.length > 0 ||
    snapshot.eventCars.length > 0 ||
    Boolean(snapshot.targetGuildId) ||
    Boolean(snapshot.targetChannelId) ||
    snapshot.pendingCover
  );
}

export function readCreateEventWip(): CreateEventWipPayload | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CREATE_EVENT_WIP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CreateEventWipPayload;
    if (parsed?.v !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCreateEventWip(snapshot: CreateEventFormSnapshot): void {
  if (typeof sessionStorage === 'undefined') return;
  if (!hasMeaningfulCreateProgress(snapshot)) {
    sessionStorage.removeItem(CREATE_EVENT_WIP_STORAGE_KEY);
    return;
  }
  const payload: CreateEventWipPayload = {
    ...snapshot,
    v: 1,
    savedAt: new Date().toISOString(),
  };
  sessionStorage.setItem(CREATE_EVENT_WIP_STORAGE_KEY, JSON.stringify(payload));
}

export function clearCreateEventWip(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(CREATE_EVENT_WIP_STORAGE_KEY);
}
