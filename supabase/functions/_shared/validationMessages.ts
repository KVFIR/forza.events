import type {ValidationCode} from './validationCodes.ts';

/** English fallback for API `error` field (client maps `code` via i18n). */
const VALIDATION_MESSAGES_EN: Record<ValidationCode, string> = {
  TITLE_REQUIRED: 'Event name is required.',
  TYPE_REQUIRED: 'Event type is required.',
  STARTS_AT_REQUIRED: 'Date and time are required.',
  GUILD_REQUIRED: 'Choose a Discord server for this event.',
  CHANNEL_REQUIRED: 'Choose a channel before publishing.',
  CONVOY_LEADER_REQUIRED: 'Convoy leader gamertag is required.',
  CARS_REQUIRED: 'Add at least one car for a restricted car list.',
  PI_RANGE: 'Set a PI cap between 100 and 999.',
  TARGET_GUILD_LOCKED: 'Server cannot be changed after publish.',
  TARGET_CHANNEL_LOCKED: 'Channel cannot be changed after publish.',
};

export function validationMessageEn(code: ValidationCode): string {
  return VALIDATION_MESSAGES_EN[code] ?? code;
}
