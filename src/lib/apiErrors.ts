import i18n from '../i18n';
import type {ApiErrorCode} from './apiErrorCodes';
import {API_ERROR_CODES} from './apiErrorCodes';
import {validationMessage} from './validationMessages';
import type {ValidationCode} from './validationCodes';
import {VALIDATION_CODE_LIST} from './validationCodes';

function isValidationCode(code: string): code is ValidationCode {
  return (VALIDATION_CODE_LIST as string[]).includes(code);
}

const API_I18N_KEYS: Partial<Record<ApiErrorCode, string>> = {
  [API_ERROR_CODES.UNAUTHORIZED]: 'errors.unauthorized',
  [API_ERROR_CODES.FORBIDDEN]: 'errors.forbidden',
  [API_ERROR_CODES.INTERNAL]: 'errors.internal',
  [API_ERROR_CODES.TOO_MANY_REQUESTS]: 'errors.tooManyRequests',
  [API_ERROR_CODES.BAD_REQUEST]: 'errors.badRequest',
  [API_ERROR_CODES.BOT_NOT_IN_GUILD]: 'errors.botNotInGuild',
  [API_ERROR_CODES.CHANNEL_NOT_FOUND]: 'errors.channelNotFound',
  [API_ERROR_CODES.CHANNEL_NOT_TEXT]: 'errors.channelNotText',
  [API_ERROR_CODES.CHANNEL_WRONG_GUILD]: 'errors.channelWrongGuild',
  [API_ERROR_CODES.BOT_NOT_GUILD_MEMBER]: 'errors.botNotGuildMember',
  [API_ERROR_CODES.BOT_CANNOT_POST]: 'errors.botCannotPost',
  [API_ERROR_CODES.EVENT_FULL]: 'errors.eventFull',
  [API_ERROR_CODES.REGISTRATION_CLOSED]: 'errors.registrationClosed',
  [API_ERROR_CODES.REGISTRATION_AFTER_START]: 'errors.registrationAfterStart',
  [API_ERROR_CODES.HOST_CANNOT_JOIN]: 'errors.hostCannotJoin',
  [API_ERROR_CODES.EVENT_NOT_FOUND]: 'errors.eventNotFound',
  [API_ERROR_CODES.NOT_DRAFT]: 'errors.notDraft',
  [API_ERROR_CODES.INVALID_RESPONSE]: 'errors.invalidResponse',
};

export class ApiRequestError extends Error {
  readonly code: string | undefined;
  readonly status: number;

  constructor(message: string, options?: {code?: string; status?: number}) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = options?.code;
    this.status = options?.status ?? 0;
  }
}

export function mapApiError(code: string | undefined, fallbackMessage: string): string {
  if (!code) return fallbackMessage;
  if (isValidationCode(code)) return validationMessage(code);
  const key = API_I18N_KEYS[code as ApiErrorCode];
  if (key) return i18n.t(key);
  return fallbackMessage;
}

export function apiErrorFromPayload(
  payload: {error?: string; message?: string; code?: string},
  status: number,
): ApiRequestError {
  const fallback = payload.error ?? payload.message ?? `Request failed: ${status}`;
  const message = mapApiError(payload.code, fallback);
  return new ApiRequestError(message, {code: payload.code, status});
}
