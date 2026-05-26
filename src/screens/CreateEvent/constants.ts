export {EVENT_TYPES} from '../../lib/eventTypes';

export const STEPS = ['Basics', 'Details', 'Target', 'Review'] as const;
export type CreateEventStep = (typeof STEPS)[number];
export type CreateEventStepIndex = 0 | 1 | 2 | 3;

export const TITLE_MAX_LENGTH = 100;
export const COVER_MAX_BYTES = 2 * 1024 * 1024;
export const COVER_ACCEPT = 'image/jpeg,image/png,image/webp';

import {
  controlInvalidClass,
  fieldErrorClass,
  fieldHintClass,
  fieldLabelClass,
  inputClass,
} from '../../components/ui/formStyles';

/** @deprecated Use `inputClass` from `components/ui/formStyles` or `<Input />`. */
export const formInput = inputClass;

/** @deprecated Use `controlInvalidClass` from `components/ui/formStyles`. */
export const formInputError = controlInvalidClass;

/** @deprecated Use `fieldLabelClass` from `components/ui/formStyles` or `<FieldLabel />`. */
export const formLabel = `${fieldLabelClass} mb-1.5`;

export const formHint = fieldHintClass;

export const formFieldError = fieldErrorClass;
