export {EVENT_TYPES} from '../../lib/eventTypes';

export type CreateEventStepIndex = 0 | 1;
export const PUBLISH_STEP_INDEX = 1 satisfies CreateEventStepIndex;

export const TITLE_MAX_LENGTH = 100;
export const DESCRIPTION_MAX_LENGTH = 2048;
export {COVER_SOURCE_MAX_BYTES as COVER_MAX_BYTES} from '../../lib/coverImage';
export const COVER_ACCEPT = 'image/jpeg,image/png,image/webp';
