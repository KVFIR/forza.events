import type {CarRuleMode, EventParticipant, EventStatus, ForzaEvent} from './types';
import type {AppUser} from './types';
import {isEventType} from './eventTypes';
import {isPiInRange} from './pi';
import {VALIDATION_CODES, type ValidationCode} from './validationCodes';
import {validationMessage} from './validationMessages';

export function validateDraftForm(input: {
  title: string;
  type: string;
  startsAtLocal: string;
}): ValidationCode | null {
  if (!input.title.trim()) return VALIDATION_CODES.TITLE_REQUIRED;
  if (!isEventType(input.type)) return VALIDATION_CODES.TYPE_REQUIRED;
  if (!input.startsAtLocal) return VALIDATION_CODES.STARTS_AT_REQUIRED;
  return null;
}

export function validatePublishForm(input: {
  title: string;
  type: string;
  startsAtLocal: string;
  guildId: string | null;
  channelId: string | null;
  carRuleMode: CarRuleMode;
  maxPi: number | null;
  carCount: number;
  lobbyLeaderGamertag: string;
}): ValidationCode | null {
  const draftErr = validateDraftForm({
    title: input.title,
    type: input.type,
    startsAtLocal: input.startsAtLocal,
  });
  if (draftErr) return draftErr;
  if (!input.guildId?.trim()) return VALIDATION_CODES.GUILD_REQUIRED;
  if (!input.channelId) return VALIDATION_CODES.CHANNEL_REQUIRED;
  if (!input.lobbyLeaderGamertag.trim()) return VALIDATION_CODES.CONVOY_LEADER_REQUIRED;
  if (input.carRuleMode === 'restricted_list' && input.carCount === 0) {
    return VALIDATION_CODES.CARS_REQUIRED;
  }
  if (
    input.carRuleMode === 'anything_goes' &&
    input.maxPi != null &&
    !isPiInRange(input.maxPi)
  ) {
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

/** Multi-group lobbies: base group is 12 seats; a host may add up to MAX_GROUPS groups. */
export const MAX_GROUPS = 5;

/** Total lobby seats across every active group. */
export function totalCapacity(
  event: Pick<ForzaEvent, 'groupCount' | 'maxPlayers'>,
): number {
  return Math.max(1, event.groupCount || 1) * event.maxPlayers;
}

export function waitlistParticipants(participants: EventParticipant[]): EventParticipant[] {
  return participants.filter((p) => p.waitlisted);
}

export function waitlistCount(event: Pick<ForzaEvent, 'participants'>): number {
  return event.participants.reduce((n, p) => (p.waitlisted ? n + 1 : n), 0);
}

/** Active (non-waitlisted) racers in a given group. */
export function groupParticipants(
  participants: EventParticipant[],
  groupIndex: number,
): EventParticipant[] {
  return participants.filter((p) => !p.waitlisted && (p.groupIndex ?? 1) === groupIndex);
}

export function groupIsFull(
  event: Pick<ForzaEvent, 'maxPlayers'>,
  groupIndex: number,
  participants: EventParticipant[],
): boolean {
  return groupParticipants(participants, groupIndex).length >= event.maxPlayers;
}

/** Group with the fewest active racers that still has a free seat; tie-break lower group index. */
export function firstOpenGroupIndex(
  event: Pick<ForzaEvent, 'groupCount' | 'maxPlayers' | 'participants'>,
): number | null {
  const groupCount = event.groupCount || 1;
  let best: number | null = null;
  let bestSize = Infinity;
  for (let g = 1; g <= groupCount; g++) {
    const size = groupParticipants(event.participants, g).length;
    if (size >= event.maxPlayers) continue;
    if (size < bestSize || (size === bestSize && (best == null || g < best))) {
      best = g;
      bestSize = size;
    }
  }
  return best;
}

/** True when every active group is full — the next join goes to the waitlist. */
export function lobbyIsFull(
  event: Pick<ForzaEvent, 'groupCount' | 'maxPlayers' | 'participants' | 'currentPlayers'>,
): boolean {
  if (event.currentPlayers >= totalCapacity(event)) return true;
  return firstOpenGroupIndex(event) === null;
}

/** Per-group active headcount targets; extra racers go to lower-numbered groups. Keep in sync with `_shared/eventGroups.ts`. */
export function balancedGroupTargets(totalActive: number, groupCount: number): number[] {
  const base = Math.floor(totalActive / groupCount);
  let remainder = totalActive % groupCount;
  const targets: number[] = [];
  for (let g = 1; g <= groupCount; g++) {
    targets.push(base + (remainder > 0 ? 1 : 0));
    remainder--;
  }
  return targets;
}

/** True when active group sizes differ from an even split. */
export function groupRosterNeedsBalance(
  event: Pick<ForzaEvent, 'groupCount' | 'participants'>,
): boolean {
  const groupCount = event.groupCount ?? 1;
  if (groupCount < 2) return false;
  const counts: number[] = [];
  for (let g = 1; g <= groupCount; g++) {
    counts.push(groupParticipants(event.participants, g).length);
  }
  const targets = balancedGroupTargets(
    counts.reduce((n, c) => n + c, 0),
    groupCount,
  );
  return counts.some((c, i) => c !== targets[i]);
}

/** True when at least two active non-leader drivers can be shuffled. */
export function groupRosterCanShuffle(
  event: Pick<ForzaEvent, 'groupCount' | 'participants'>,
): boolean {
  const groupCount = event.groupCount ?? 1;
  if (groupCount < 2) return false;
  let drivers = 0;
  for (const p of event.participants) {
    if (p.waitlisted || p.isConvoyLeader) continue;
    drivers++;
  }
  return drivers >= 2;
}

/** Host may add another group when every active group is full (12/24/36…). */
export function canAddGroup(event: ForzaEvent, user: AppUser): boolean {
  return (
    event.hostDiscordId === user.discordId &&
    isPublishedToDiscord(event) &&
    !isEventFinalized(event) &&
    !eventHasStarted(event) &&
    (event.groupCount ?? 1) < MAX_GROUPS &&
    lobbyIsFull(event)
  );
}

/** UI status badge / card styling — accounts for start time, not only DB `status`. */
export function resolveEventDisplayStatus(
  event: Pick<
    ForzaEvent,
    'status' | 'lifecycle' | 'startsAt' | 'currentPlayers' | 'maxPlayers' | 'groupCount'
  >,
): EventStatus {
  if (isEventFinalized(event)) return 'ended';
  if (eventHasStarted(event)) return 'live';
  if (event.status === 'full' || event.currentPlayers >= totalCapacity(event)) return 'full';
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

/** Public browse feed — published events until completed/cancelled/archived (incl. after start). */
export function isBrowseFeedEvent(event: ForzaEvent): boolean {
  return isPublishedToDiscord(event) && !isEventFinalized(event);
}

/** True once publish-event has posted the Discord announcement embed. */
export function isPublishedToDiscord(event: Pick<ForzaEvent, 'discordMessageId'>): boolean {
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

/** Host recovery when results saved but ranked ELO apply failed. */
export function canRetryEventRatings(event: ForzaEvent, user: AppUser): boolean {
  return (
    event.hostDiscordId === user.discordId &&
    event.lifecycle === 'completed' &&
    Boolean(event.isRanked) &&
    !event.ratingApplied
  );
}
