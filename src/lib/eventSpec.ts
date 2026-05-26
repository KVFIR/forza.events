import type {CarRuleMode, ForzaEvent} from './types';
import type {AppUser} from './types';
import {isEventType} from './eventTypes';

export function normalizeTrackCodes(codes: string[]): string[] {
  return codes.map((c) => c.trim()).filter(Boolean);
}

export function validateDraftForm(input: {
  title: string;
  type: string;
  startsAtLocal: string;
  guildId: string | null;
}): string | null {
  if (!input.title.trim()) return 'Event name is required.';
  if (!isEventType(input.type)) return 'Event type is required.';
  if (!input.startsAtLocal) return 'Date and time are required.';
  if (!input.guildId) return 'Choose a Discord server for this event.';
  return null;
}

export function validatePublishForm(input: {
  title: string;
  type: string;
  startsAtLocal: string;
  guildId: string | null;
  channelId: string | null;
  carRuleMode: CarRuleMode;
  maxPi: number;
  carCount: number;
  lobbyLeaderGamertag: string;
}): string | null {
  const draftErr = validateDraftForm({
    title: input.title,
    type: input.type,
    startsAtLocal: input.startsAtLocal,
    guildId: input.guildId,
  });
  if (draftErr) return draftErr;
  if (!input.channelId) return 'Choose a channel before publishing.';
  if (!input.lobbyLeaderGamertag.trim()) return 'Convoy leader gamertag is required.';
  if (input.carRuleMode === 'restricted_list' && input.carCount === 0) {
    return 'Add at least one car for a restricted car list.';
  }
  if (input.carRuleMode === 'anything_goes' && (input.maxPi < 100 || input.maxPi > 999)) {
    return 'Set a PI cap between 100 and 999.';
  }
  return null;
}

export function eventHasStarted(event: ForzaEvent): boolean {
  if (event.lifecycle === 'live') return true;
  if (event.status === 'live' || event.status === 'ended') return true;
  return new Date(event.startsAt).getTime() <= Date.now();
}

export function isEventFinalized(event: ForzaEvent): boolean {
  return (
    event.lifecycle === 'cancelled' ||
    event.lifecycle === 'completed' ||
    event.lifecycle === 'archived'
  );
}

export function isRegistrationOpen(event: ForzaEvent): boolean {
  if (event.lifecycle === 'draft') return false;
  if (isEventFinalized(event)) return false;
  return !eventHasStarted(event);
}

/** True once publish-event has posted the Discord announcement embed. */
export function isPublishedToDiscord(event: ForzaEvent): boolean {
  return Boolean(event.discordMessageId?.trim());
}

export function canDeleteDraft(event: ForzaEvent, user: AppUser): boolean {
  return event.hostDiscordId === user.discordId && !isPublishedToDiscord(event);
}

export function isPublishedEvent(event: ForzaEvent): boolean {
  return isPublishedToDiscord(event);
}

export function canEditEvent(event: ForzaEvent, user: AppUser): boolean {
  if (event.hostDiscordId !== user.discordId) return false;
  if (event.lifecycle === 'draft') return true;
  if (event.lifecycle === 'cancelled' || event.lifecycle === 'completed') return false;
  return !eventHasStarted(event);
}

/** Host may cancel a published announcement (before or after start). */
export function canCancelEvent(event: ForzaEvent, user: AppUser): boolean {
  return (
    event.hostDiscordId === user.discordId &&
    isPublishedToDiscord(event) &&
    !isEventFinalized(event)
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
