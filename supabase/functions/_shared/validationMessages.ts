import type {ValidationCode} from './validationCodes.ts';
import {piRangeLabelEn} from './pi.ts';

/** English fallback for API `error` field (client maps `code` via i18n). */
const VALIDATION_MESSAGES_EN: Record<ValidationCode, string> = {
  TITLE_REQUIRED: 'Event name is required.',
  TYPE_REQUIRED: 'Event type is required.',
  STARTS_AT_REQUIRED: 'Date and time are required.',
  GUILD_REQUIRED: 'Choose a Discord server for this event.',
  CHANNEL_REQUIRED: 'Choose a channel before publishing.',
  CONVOY_LEADER_REQUIRED: 'Convoy leader gamertag is required.',
  CONVOY_LEADER_DISCORD_REQUIRED: 'Choose a convoy leader from your Discord server.',
  CONVOY_LEADER_HANDLE_REQUIRED: 'Convoy leader Discord handle could not be resolved.',
  CONVOY_LEADER_NOT_IN_GUILD:
    'Convoy leader must be a member of the selected Discord server.',
  CONVOY_LEADER_GUILD_CHECK_FAILED:
    'Could not verify convoy leader membership. Try again in a moment.',
  CARS_REQUIRED: 'Add at least one car for a restricted car list.',
  CARS_UNRESOLVED:
    'One or more cars could not be matched to the catalog. Remove and re-add them, or refresh the car list.',
  CARS_SYNC_FAILED: 'Could not save the car list. Try again.',
  PI_RANGE: `Set a PI cap from ${piRangeLabelEn()}.`,
  TARGET_GUILD_LOCKED: 'Server cannot be changed after publish.',
  TARGET_CHANNEL_LOCKED: 'Channel cannot be changed after publish.',
  GAME_LOCKED: 'Game cannot be changed after publish.',
  TRACK_NAME_REQUIRED: 'Each track needs a name.',
  TRACK_SHARE_CODE_INVALID: 'Share code must be nine digits.',
  TRACK_FORMAT_TOO_LONG: 'Format is too long (max 100 characters).',
  TRACKS_TOO_MANY: 'You can add up to 10 tracks.',
};

export function validationMessageEn(code: ValidationCode): string {
  return VALIDATION_MESSAGES_EN[code] ?? code;
}
