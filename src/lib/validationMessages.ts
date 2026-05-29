import i18n from '../i18n';
import {piRangeI18nParams} from './pi';
import type {ValidationCode} from './validationCodes';
import {VALIDATION_CODES} from './validationCodes';

const VALIDATION_I18N_KEYS: Record<ValidationCode, string> = {
  TITLE_REQUIRED: 'validation.titleRequired',
  TYPE_REQUIRED: 'validation.typeRequired',
  STARTS_AT_REQUIRED: 'validation.dateRequired',
  GUILD_REQUIRED: 'validation.guildRequired',
  CHANNEL_REQUIRED: 'validation.channelRequired',
  CONVOY_LEADER_REQUIRED: 'validation.convoyLeaderRequired',
  CONVOY_LEADER_DISCORD_REQUIRED: 'validation.convoyLeaderDiscordRequired',
  CONVOY_LEADER_HANDLE_REQUIRED: 'validation.convoyLeaderHandleRequired',
  CONVOY_LEADER_NOT_IN_GUILD: 'validation.convoyLeaderNotInGuild',
  CONVOY_LEADER_GUILD_CHECK_FAILED: 'validation.convoyLeaderGuildCheckFailed',
  CARS_REQUIRED: 'validation.carsRequired',
  PI_RANGE: 'validation.piRange',
  TARGET_GUILD_LOCKED: 'validation.targetGuildLocked',
  TARGET_CHANNEL_LOCKED: 'validation.targetChannelLocked',
  TRACK_NAME_REQUIRED: 'validation.trackNameRequired',
  TRACK_SHARE_CODE_INVALID: 'validation.trackShareCodeInvalid',
  TRACK_FORMAT_TOO_LONG: 'validation.trackFormatTooLong',
  TRACKS_TOO_MANY: 'validation.tracksTooMany',
};

export function validationMessage(code: ValidationCode): string {
  const key = VALIDATION_I18N_KEYS[code];
  if (!key) return code;
  if (code === VALIDATION_CODES.PI_RANGE) {
    return i18n.t(key, piRangeI18nParams());
  }
  return i18n.t(key);
}
