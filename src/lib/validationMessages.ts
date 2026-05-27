import i18n from '../i18n';
import type {ValidationCode} from './validationCodes';

const VALIDATION_I18N_KEYS: Record<ValidationCode, string> = {
  TITLE_REQUIRED: 'validation.titleRequired',
  TYPE_REQUIRED: 'validation.typeRequired',
  STARTS_AT_REQUIRED: 'validation.dateRequired',
  GUILD_REQUIRED: 'validation.guildRequired',
  CHANNEL_REQUIRED: 'validation.channelRequired',
  CONVOY_LEADER_REQUIRED: 'validation.convoyLeaderRequired',
  CONVOY_LEADER_DISCORD_REQUIRED: 'validation.convoyLeaderDiscordRequired',
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
  return key ? i18n.t(key) : code;
}
