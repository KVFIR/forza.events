import type {CarRuleMode, EventStatus, ForzaEvent} from './types';
import type {AppUser} from './types';
import {isEventType} from './eventTypes';
import {isPiInRange} from './pi';
import {VALIDATION_CODES, type ValidationCode} from './validationCodes';
import {validationMessage} from './validationMessages';

export function validateDraftForm(input: {
  title: string;
  type: string;
  startsAtLocal: string;
  guildId: string | null;
}): ValidationCode | null {
  if (!input.title.trim()) return VALIDATION_CODES.TITLE_REQUIRED;
  if (!isEventType(input.type)) return VALIDATION_CODES.TYPE_REQUIRED;
  if (!input.startsAtLocal) return VALIDATION_CODES.STARTS_AT_REQUIRED;
  if (!input.guildId) return VALIDATION_CODES.GUILD_REQUIRED;
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
}): ValidationCode | null {
  const draftErr = validateDraftForm({
    title: input.title,
    type: input.type,
    startsAtLocal: input.startsAtLocal,
    guildId: input.guildId,
  });
  if (draftErr) return draftErr;
  if (!input.channelId) return VALIDATION_CODES.CHANNEL_REQUIRED;
  if (!input.lobbyLeaderGamertag.trim()) return VALIDATION_CODES.CONVOY_LEADER_REQUIRED;
  if (input.carRuleMode === 'restricted_list' && input.carCount === 0) {
    return VALIDATION_CODES.CARS_REQUIRED;
  }
  if (input.carRuleMode === 'anything_goes' && !isPiInRange(input.maxPi)) {
    return VALIDATION_CODES.PI_RANGE;
  }
  return null;
}

/** Localized message for create/review validation. */
export function validateDraftFormMessage(
  input: Parameters<typeof validateDraftForm>[0],
): string | null {
  const code = validateDraftForm(input);
  return code ? validationMessage(code) : null;
}

export function validatePublishFormMessage(
  input: Parameters<typeof validatePublishForm>[0],
): string | null {
  const code = validatePublishForm(input);
  return code ? validationMessage(code) : null;
}

export function eventHasStarted(
  event: Pick<ForzaEvent, 'lifecycle' | 'status' | 'startsAt'>,
): boolean {
  if (event.lifecycle === 'live') return true;
  if (event.status === 'live' || event.status === 'ended') return true;
  return new Date(event.startsAt).getTime() <= Date.now();
}

/** UI status badge / card styling — accounts for start time, not only DB `status`. */
export function resolveEventDisplayStatus(
  event: Pick<ForzaEvent, 'status' | 'lifecycle' | 'startsAt' | 'currentPlayers' | 'maxPlayers'>,
): EventStatus {
  if (isEventFinalized(event)) return 'ended';
  if (eventHasStarted(event)) return 'live';
  if (event.status === 'full' || event.currentPlayers >= event.maxPlayers) return 'full';
  return 'open';
}

export function isEventFinalized(event: Pick<ForzaEvent, 'lifecycle'>): boolean {
  return (
    event.lifecycle === 'cancelled' ||
    event.lifecycle === 'completed' ||
    event.lifecycle === 'archived'
  );
}

/** Host submitted results — excludes cancelled/archived. */
export function isEventSuccessfullyCompleted(event: ForzaEvent): boolean {
  return event.lifecycle === 'completed';
}

export function shouldShowEventResults(event: ForzaEvent): boolean {
  if (event.lifecycle === 'cancelled') return false;
  if (event.lifecycle === 'completed') return true;
  return eventHasStarted(event) && !isEventFinalized(event);
}

export function isRegistrationOpen(event: ForzaEvent): boolean {
  if (event.lifecycle === 'draft') return false;
  if (isEventFinalized(event)) return false;
  return !eventHasStarted(event);
}

/** Join/leave window — roster locks after start (leave disabled). */
export function canLeaveRegistration(event: ForzaEvent): boolean {
  return isRegistrationOpen(event);
}

/** Public browse feed — upcoming published events with registration still open. */
export function isBrowseFeedEvent(event: ForzaEvent): boolean {
  return isPublishedToDiscord(event) && isRegistrationOpen(event);
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
export function canCancelPublishedEvent(event: ForzaEvent, user: AppUser): boolean {
  return (
    event.hostDiscordId === user.discordId &&
    isPublishedToDiscord(event) &&
    !isEventFinalized(event)
  );
}

/** Post-start cancel on event detail (and legacy checks). */
export function canCancelEvent(event: ForzaEvent, user: AppUser): boolean {
  return canCancelPublishedEvent(event, user) && eventHasStarted(event);
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
