import type {CarRuleMode, ForzaEvent} from './types';
import type {AppUser} from './types';

export function normalizeTrackCodes(codes: string[]): string[] {
  return codes.map((c) => c.trim()).filter(Boolean);
}

export function validateDraftForm(input: {
  title: string;
  startsAtLocal: string;
  guildId: string | null;
}): string | null {
  if (!input.title.trim()) return 'Event name is required.';
  if (!input.startsAtLocal) return 'Date and time are required.';
  if (!input.guildId) return 'Choose a Discord server for this event.';
  return null;
}

export function validatePublishForm(input: {
  title: string;
  startsAtLocal: string;
  guildId: string | null;
  channelId: string | null;
  trackCodes: string[];
  carRuleMode: CarRuleMode;
  maxPi: number;
  carCount: number;
  lobbyLeaderGamertag: string;
}): string | null {
  const draftErr = validateDraftForm({
    title: input.title,
    startsAtLocal: input.startsAtLocal,
    guildId: input.guildId,
  });
  if (draftErr) return draftErr;
  if (!input.channelId) return 'Choose a channel before publishing.';
  if (!input.lobbyLeaderGamertag.trim()) return 'Convoy leader gamertag is required.';
  if (normalizeTrackCodes(input.trackCodes).length === 0) return 'Add at least one track code.';
  if (input.carRuleMode === 'restricted_list' && input.carCount === 0) {
    return 'Add at least one car for a restricted car list.';
  }
  if (input.carRuleMode === 'anything_goes' && (input.maxPi < 100 || input.maxPi > 999)) {
    return 'Set a PI cap between 100 and 999.';
  }
  return null;
}

export function eventHasStarted(event: ForzaEvent): boolean {
  if (event.status === 'live' || event.status === 'ended') return true;
  return new Date(event.startsAt).getTime() <= Date.now();
}

export function isPublishedEvent(event: ForzaEvent): boolean {
  return event.lifecycle !== 'draft';
}

export function canEditEvent(event: ForzaEvent, user: AppUser): boolean {
  if (event.hostDiscordId !== user.discordId) return false;
  if (event.lifecycle === 'draft') return true;
  if (event.lifecycle === 'cancelled' || event.lifecycle === 'completed') return false;
  return !eventHasStarted(event);
}

export function canCancelEvent(event: ForzaEvent, user: AppUser): boolean {
  return (
    event.hostDiscordId === user.discordId &&
    event.lifecycle !== 'draft' &&
    event.lifecycle !== 'cancelled' &&
    event.lifecycle !== 'completed' &&
    eventHasStarted(event)
  );
}

export function canSubmitEventResults(event: ForzaEvent, user: AppUser): boolean {
  return (
    event.hostDiscordId === user.discordId &&
    event.lifecycle !== 'draft' &&
    event.lifecycle !== 'cancelled' &&
    event.lifecycle !== 'completed' &&
    eventHasStarted(event)
  );
}
