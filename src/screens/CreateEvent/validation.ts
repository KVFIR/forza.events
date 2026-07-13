import i18n from '../../i18n';
import {gamertagError} from '../../lib/gamertag';
import {defaultTimezone, localInputToUtc} from '../../lib/datetime';
import {isEventType} from '../../lib/eventTypes';
import {
  validateDraftFormMessage,
  validatePublishFormMessage,
} from '../../lib/eventSpec';
import {validateTracks} from '../../lib/eventTracks';
import {validationMessage} from '../../lib/validationMessages';
import type {CarRuleMode} from '../../lib/types';
import {COVER_SOURCE_MAX_MB} from '../../lib/coverImage';
import {isPiInRange, piRangeI18nParams} from '../../lib/pi';
import {COVER_ACCEPT, COVER_MAX_BYTES, TITLE_MAX_LENGTH, type CreateEventStepIndex} from './constants';
import type {CreateEventFormValues, FieldErrors} from './types';

const EVENT_STEP_FIELD_KEYS = new Set([
  'title',
  'type',
  'startsAtLocal',
  'cover',
  'tracks',
  'eventCars',
  'maxPi',
]);

export function firstFieldErrorStep(errors: FieldErrors): CreateEventStepIndex {
  for (const key of Object.keys(errors)) {
    if (EVENT_STEP_FIELD_KEYS.has(key)) return 0;
  }
  return 1;
}

export function scrollToFirstFieldError(errors: FieldErrors): void {
  const firstKey = Object.keys(errors)[0];
  if (!firstKey) return;
  const el = document.getElementById(`create-${firstKey}`);
  el?.scrollIntoView({behavior: 'smooth', block: 'center'});
  if (el instanceof HTMLElement && typeof el.focus === 'function') {
    el.focus({preventScroll: true});
  }
}

/** Wait for step transition paint before scrolling to a field error. */
export function scrollToFirstFieldErrorAfterPaint(errors: FieldErrors): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => scrollToFirstFieldError(errors));
  });
}

export type FormValidationOutcome =
  | {ok: true}
  | {ok: false; fieldErrors: FieldErrors; globalError?: string | null};

export function hasFieldErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

function validateStartsInFuture(startsAtLocal: string): string | null {
  if (!startsAtLocal) return null;
  const utc = localInputToUtc(startsAtLocal, defaultTimezone());
  if (new Date(utc).getTime() <= Date.now()) {
    return i18n.t('validation.futureDate');
  }
  return null;
}

export function validateCoverFile(file: File | null): string | null {
  if (!file) return null;
  if (!COVER_ACCEPT.split(',').includes(file.type)) {
    return i18n.t('validation.coverFormat');
  }
  if (file.size > COVER_MAX_BYTES) {
    return i18n.t('validation.coverSize', {maxMb: COVER_SOURCE_MAX_MB});
  }
  return null;
}

export function validateBasicsStep(
  values: Pick<CreateEventFormValues, 'title' | 'type' | 'startsAtLocal' | 'coverFile'>,
  options?: {allowPastStart?: boolean},
): FieldErrors {
  const errors: FieldErrors = {};
  const title = values.title.trim();
  if (!title) errors.title = i18n.t('validation.titleRequired');
  if (!isEventType(values.type)) errors.type = i18n.t('validation.typeRequired');
  else if (title.length > TITLE_MAX_LENGTH) {
    errors.title = i18n.t('validation.titleMax', {max: TITLE_MAX_LENGTH});
  }
  if (!values.startsAtLocal) errors.startsAtLocal = i18n.t('validation.dateRequired');
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
    'carRuleMode' | 'maxPi' | 'eventCars' | 'tracks'
  >,
): FieldErrors {
  const errors: FieldErrors = {};
  const trackCode = validateTracks(values.tracks);
  if (trackCode) errors.tracks = validationMessage(trackCode);
  if (values.carRuleMode === 'restricted_list' && values.eventCars.length === 0) {
    errors.eventCars = i18n.t('validation.carsRequired');
  }
  if (values.carRuleMode === 'anything_goes') {
    if (!isPiInRange(values.maxPi)) {
      errors.maxPi = i18n.t('validation.piRange', piRangeI18nParams());
    }
  }
  return errors;
}

export function validateConvoyFields(
  values: Pick<
    CreateEventFormValues,
    'lobbyLeaderIsHost' | 'lobbyLeaderGamertag' | 'lobbyLeaderDiscordId'
  >,
  options?: {hostGamertag?: string},
): FieldErrors {
  const errors: FieldErrors = {};
  if (values.lobbyLeaderIsHost) {
    const tagErr = gamertagError(options?.hostGamertag ?? '');
    if (tagErr) {
      errors.lobbyLeaderGamertag = i18n.t('validation.convoyLeaderProfile');
    }
  } else {
    if (!values.lobbyLeaderDiscordId) {
      errors.lobbyLeaderDiscordId = i18n.t('validation.convoyLeaderDiscordRequired');
    }
    const tagErr = gamertagError(values.lobbyLeaderGamertag);
    if (tagErr) errors.lobbyLeaderGamertag = tagErr;
  }
  return errors;
}

export function validateTargetStep(
  values: Pick<
    CreateEventFormValues,
    | 'targetGuildId'
    | 'targetChannelId'
    | 'lobbyLeaderIsHost'
    | 'lobbyLeaderGamertag'
    | 'lobbyLeaderDiscordId'
  >,
  options?: {requireChannel?: boolean; requireGuild?: boolean; hostGamertag?: string},
): FieldErrors {
  const errors: FieldErrors = {};
  if (options?.requireGuild !== false && !values.targetGuildId.trim()) {
    errors.targetGuildId = i18n.t('validation.guildRequired');
  }
  if (options?.requireChannel && !values.targetChannelId) {
    errors.targetChannelId = i18n.t('validation.channelRequired');
  }
  return {...errors, ...validateConvoyFields(values, options)};
}

export function validateEventStep(
  values: CreateEventFormValues,
  options?: {allowPastStart?: boolean},
): FieldErrors {
  return {
    ...validateBasicsStep(values, {allowPastStart: options?.allowPastStart}),
    ...validateDetailsStep(values),
  };
}

export function validatePublishStep(
  values: CreateEventFormValues,
  options?: {requireChannel?: boolean; hostGamertag?: string},
): FieldErrors {
  return validateTargetStep(values, options);
}

export function validateStep(
  step: number,
  values: CreateEventFormValues,
  options?: {requireChannel?: boolean; allowPastStart?: boolean; hostGamertag?: string},
): FieldErrors {
  switch (step) {
    case 0:
      return validateEventStep(values, {allowPastStart: options?.allowPastStart});
    case 1:
      return validatePublishStep(values, options);
    default:
      return {};
  }
}

function mergeDraftFieldErrors(
  values: CreateEventFormValues,
  hostGamertag?: string,
  options?: {allowPastStart?: boolean},
): FieldErrors {
  return {
    ...validateBasicsStep(values, {allowPastStart: options?.allowPastStart}),
    ...validateDetailsStep(values),
    ...validateTargetStep(values, {hostGamertag, requireChannel: false, requireGuild: false}),
  };
}

function mergePublishFieldErrors(
  values: CreateEventFormValues,
  hostGamertag: string,
  options?: {allowPastStart?: boolean},
): FieldErrors {
  return {
    ...validateBasicsStep(values, {allowPastStart: options?.allowPastStart}),
    ...validateDetailsStep(values),
    ...validateTargetStep(values, {hostGamertag, requireChannel: true}),
  };
}

export function validateDraftFormOutcome(
  values: CreateEventFormValues,
  hostGamertag?: string,
  options?: {allowPastStart?: boolean},
): FormValidationOutcome {
  const fieldErrors = mergeDraftFieldErrors(values, hostGamertag, options);
  if (hasFieldErrors(fieldErrors)) {
    return {ok: false, fieldErrors};
  }
  const globalError = validateDraftFormMessage({
    title: values.title,
    type: isEventType(values.type) ? values.type : '',
    startsAtLocal: values.startsAtLocal,
  });
  if (globalError) return {ok: false, fieldErrors: {}, globalError};
  return {ok: true};
}

export function validatePublishFormOutcome(
  values: CreateEventFormValues,
  hostGamertag: string,
  options?: {allowPastStart?: boolean},
): FormValidationOutcome {
  const fieldErrors = mergePublishFieldErrors(values, hostGamertag, options);
  if (hasFieldErrors(fieldErrors)) {
    return {ok: false, fieldErrors};
  }
  const leader = values.lobbyLeaderIsHost ? hostGamertag : values.lobbyLeaderGamertag;
  const globalError = validatePublishFormMessage({
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
  if (globalError) return {ok: false, fieldErrors: {}, globalError};
  return {ok: true};
}
