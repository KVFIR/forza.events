import i18n from '../../i18n';
import {gamertagError} from '../../lib/gamertag';
import {defaultTimezone, localInputToUtc} from '../../lib/datetime';
import {isEventType} from '../../lib/eventTypes';
import {
  validateDraftFormMessage,
  validatePublishFormMessage,
} from '../../lib/eventSpec';
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
    return i18n.t('validation.coverSize');
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
    'carRuleMode' | 'maxPi' | 'eventCars' | 'trackCodes'
  >,
): FieldErrors {
  const errors: FieldErrors = {};
  if (values.carRuleMode === 'restricted_list' && values.eventCars.length === 0) {
    errors.eventCars = i18n.t('validation.carsRequired');
  }
  if (values.carRuleMode === 'anything_goes') {
    if (values.maxPi < 100 || values.maxPi > 999) {
      errors.maxPi = i18n.t('validation.piRange');
    }
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
  options?: {requireChannel?: boolean; hostGamertag?: string},
): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.targetGuildId) errors.targetGuildId = i18n.t('validation.guildRequired');
  if (options?.requireChannel && !values.targetChannelId) {
    errors.targetChannelId = i18n.t('validation.channelRequired');
  }
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

export function validateStep(
  step: number,
  values: CreateEventFormValues,
  options?: {requireChannel?: boolean; allowPastStart?: boolean; hostGamertag?: string},
): FieldErrors {
  switch (step) {
    case 0:
      return validateBasicsStep(values, {allowPastStart: options?.allowPastStart});
    case 1:
      return validateDetailsStep(values);
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
  const detailsErr = firstFieldError(validateDetailsStep(values));
  if (detailsErr) return detailsErr;
  const targetErr = firstFieldError(validateTargetStep(values, {hostGamertag}));
  if (targetErr) return targetErr;
  return validateDraftFormMessage({
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
  const details = validateDetailsStep(values);
  if (hasFieldErrors(details)) return firstFieldError(details);
  const target = validateTargetStep(values, {requireChannel: true, hostGamertag});
  if (hasFieldErrors(target)) return firstFieldError(target);

  const leader = values.lobbyLeaderIsHost
    ? hostGamertag
    : values.lobbyLeaderGamertag;

  return validatePublishFormMessage({
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
