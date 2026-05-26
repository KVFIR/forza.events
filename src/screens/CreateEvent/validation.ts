import {gamertagError} from '../../lib/gamertag';
import {defaultTimezone, localInputToUtc} from '../../lib/datetime';
import {isEventType} from '../../lib/eventTypes';
import {validateDraftForm, validatePublishForm} from '../../lib/eventSpec';
import type {CarRuleMode} from '../../lib/types';
import {COVER_ACCEPT, COVER_MAX_BYTES, TITLE_MAX_LENGTH} from './constants';
import type {CreateEventFormValues, FieldErrors} from './types';

export function hasFieldErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function firstFieldError(errors: FieldErrors): string | null {
  const keys = Object.keys(errors);
  return keys.length ? (errors[keys[0]] ?? null) : null;
}

function validateStartsInFuture(startsAtLocal: string): string | null {
  if (!startsAtLocal) return null;
  const utc = localInputToUtc(startsAtLocal, defaultTimezone());
  if (new Date(utc).getTime() <= Date.now()) {
    return 'Choose a date and time in the future.';
  }
  return null;
}

export function validateCoverFile(file: File | null): string | null {
  if (!file) return null;
  if (!COVER_ACCEPT.split(',').includes(file.type)) {
    return 'Use JPEG, PNG, or WebP.';
  }
  if (file.size > COVER_MAX_BYTES) {
    return 'Cover image must be 2 MB or smaller.';
  }
  return null;
}

export function validateBasicsStep(
  values: Pick<CreateEventFormValues, 'title' | 'type' | 'startsAtLocal' | 'coverFile'>,
  options?: {allowPastStart?: boolean},
): FieldErrors {
  const errors: FieldErrors = {};
  const title = values.title.trim();
  if (!title) errors.title = 'Event name is required.';
  if (!isEventType(values.type)) errors.type = 'Event type is required.';
  else if (title.length > TITLE_MAX_LENGTH) {
    errors.title = `Keep the name under ${TITLE_MAX_LENGTH} characters.`;
  }
  if (!values.startsAtLocal) errors.startsAtLocal = 'Date and time are required.';
  else if (!options?.allowPastStart) {
    const futureErr = validateStartsInFuture(values.startsAtLocal);
    if (futureErr) errors.startsAtLocal = futureErr;
  }
  const coverErr = validateCoverFile(values.coverFile);
  if (coverErr) errors.cover = coverErr;
  return errors;
}

export function validateDetailsStep(
  values: Pick<
    CreateEventFormValues,
    | 'carRuleMode'
    | 'maxPi'
    | 'eventCars'
    | 'trackCodes'
    | 'lobbyLeaderIsHost'
    | 'lobbyLeaderGamertag'
  >,
  options?: {hostGamertag?: string},
): FieldErrors {
  const errors: FieldErrors = {};
  if (values.lobbyLeaderIsHost) {
    const tagErr = gamertagError(options?.hostGamertag ?? '');
    if (tagErr) {
      errors.lobbyLeaderGamertag =
        'Add your Xbox gamertag in Profile, or uncheck “I am the convoy leader” and enter another player.';
    }
  } else {
    const tagErr = gamertagError(values.lobbyLeaderGamertag);
    if (tagErr) errors.lobbyLeaderGamertag = tagErr;
  }
  if (values.carRuleMode === 'restricted_list' && values.eventCars.length === 0) {
    errors.eventCars = 'Add at least one car for a restricted list.';
  }
  if (values.carRuleMode === 'anything_goes') {
    if (values.maxPi < 100 || values.maxPi > 999) {
      errors.maxPi = 'Set a PI cap between 100 and 999.';
    }
  }
  return errors;
}

export function validateTargetStep(values: Pick<
  CreateEventFormValues,
  'targetGuildId' | 'targetChannelId'
>, options?: {requireChannel?: boolean}): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.targetGuildId) errors.targetGuildId = 'Choose a Discord server for this event.';
  if (options?.requireChannel && !values.targetChannelId) {
    errors.targetChannelId = 'Choose a channel before publishing.';
  }
  return errors;
}

export function validateStep(
  step: number,
  values: CreateEventFormValues,
  options?: {requireChannel?: boolean; allowPastStart?: boolean; hostGamertag?: string},
): FieldErrors {
  switch (step) {
    case 0:
      return validateBasicsStep(values, {allowPastStart: options?.allowPastStart});
    case 1:
      return validateDetailsStep(values, {hostGamertag: options?.hostGamertag});
    case 2:
      return validateTargetStep(values, options);
    default:
      return {};
  }
}

export function validateDraftSave(
  values: CreateEventFormValues,
  hostGamertag?: string,
): string | null {
  const stepErr = firstFieldError(validateBasicsStep(values));
  if (stepErr) return stepErr;
  const detailsErr = firstFieldError(validateDetailsStep(values, {hostGamertag}));
  if (detailsErr) return detailsErr;
  const targetErr = firstFieldError(validateTargetStep(values));
  if (targetErr) return targetErr;
  return validateDraftForm({
    title: values.title,
    type: values.type,
    startsAtLocal: values.startsAtLocal,
    guildId: values.targetGuildId,
  });
}

export function validatePublish(
  values: CreateEventFormValues,
  hostGamertag: string,
  options?: {allowPastStart?: boolean},
): string | null {
  const basics = validateBasicsStep(values, {allowPastStart: options?.allowPastStart});
  if (hasFieldErrors(basics)) return firstFieldError(basics);
  const details = validateDetailsStep(values, {hostGamertag});
  if (hasFieldErrors(details)) return firstFieldError(details);
  const target = validateTargetStep(values, {requireChannel: true});
  if (hasFieldErrors(target)) return firstFieldError(target);

  const leader = values.lobbyLeaderIsHost
    ? hostGamertag
    : values.lobbyLeaderGamertag;

  return validatePublishForm({
    title: values.title,
    type: values.type,
    startsAtLocal: values.startsAtLocal,
    guildId: values.targetGuildId,
    channelId: values.targetChannelId,
    carRuleMode: values.carRuleMode as CarRuleMode,
    maxPi: values.maxPi,
    carCount: values.eventCars.length,
    lobbyLeaderGamertag: leader,
  });
}
