import i18n from '../i18n';
import type {ValidationCode} from './validationCodes';

const VALIDATION_I18N_KEYS: Record<ValidationCode, string> = {
  TITLE_REQUIRED: 'validation.titleRequired',
  TYPE_REQUIRED: 'validation.typeRequired',
  STARTS_AT_REQUIRED: 'validation.dateRequired',
  GUILD_REQUIRED: 'validation.guildRequired',
  CHANNEL_REQUIRED: 'validation.channelRequired',
  CONVOY_LEADER_REQUIRED: 'validation.convoyLeaderRequired',
  CARS_REQUIRED: 'validation.carsRequired',
  PI_RANGE: 'validation.piRange',
  TARGET_GUILD_LOCKED: 'validation.targetGuildLocked',
  TARGET_CHANNEL_LOCKED: 'validation.targetChannelLocked',
};

export function validationMessage(code: ValidationCode): string {
  const key = VALIDATION_I18N_KEYS[code];
  return key ? i18n.t(key) : code;
}
