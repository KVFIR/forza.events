import {jsonResponse} from './cors.ts';
import type {ApiErrorCode} from './apiErrorCodes.ts';
import {API_ERROR_CODES} from './apiErrorCodes.ts';
import type {ValidationCode} from './validationCodes.ts';
import {validationMessageEn} from './validationMessages.ts';

const API_MESSAGES_EN: Partial<Record<ApiErrorCode, string>> = {
  [API_ERROR_CODES.UNAUTHORIZED]: 'Unauthorized',
  [API_ERROR_CODES.FORBIDDEN]: 'Forbidden',
  [API_ERROR_CODES.INTERNAL]: 'Internal error',
  [API_ERROR_CODES.TOO_MANY_REQUESTS]: 'Too many requests',
  [API_ERROR_CODES.BAD_REQUEST]: 'Bad request',
  [API_ERROR_CODES.METHOD_NOT_ALLOWED]: 'Method not allowed',
  [API_ERROR_CODES.NOT_FOUND]: 'Not found',
  [API_ERROR_CODES.BOT_NOT_IN_GUILD]:
    'FORZA.EVENTS is not installed in this server. Add the app to the server first.',
  [API_ERROR_CODES.CHANNEL_NOT_FOUND]:
    'Channel not found. Choose another channel or refresh the list.',
  [API_ERROR_CODES.CHANNEL_NOT_TEXT]: 'Only text channels can be used for announcements.',
  [API_ERROR_CODES.CHANNEL_WRONG_GUILD]: 'Channel does not belong to the selected server.',
  [API_ERROR_CODES.BOT_NOT_GUILD_MEMBER]: 'Bot is not a member of this server.',
  [API_ERROR_CODES.BOT_CANNOT_POST]:
    'FORZA.EVENTS cannot post in this channel. Allow View Channel, Send Messages, and Embed Links for the bot (or its role) in channel settings.',
  [API_ERROR_CODES.EVENT_FULL]: 'Event full',
  [API_ERROR_CODES.REGISTRATION_CLOSED]: 'Registration is closed',
  [API_ERROR_CODES.REGISTRATION_AFTER_START]: 'Registration closed after event start',
  [API_ERROR_CODES.HOST_CANNOT_JOIN]: 'Event hosts do not need to join',
  [API_ERROR_CODES.EVENT_NOT_FOUND]: 'Event not found',
  [API_ERROR_CODES.NOT_DRAFT]: 'Only draft events can be published',
  [API_ERROR_CODES.RESULTS_PARTICIPANTS_ONLY]:
    'Results can only include joined drivers or the convoy leader (host leader is always allowed).',
  [API_ERROR_CODES.PUBLISH_IN_PROGRESS]:
    'This event is already being published. Wait a moment and try again.',
  [API_ERROR_CODES.RESULTS_ALREADY_SUBMITTED]:
    'Results cannot be changed after submission',
  [API_ERROR_CODES.PROFILE_INCOMPLETE]:
    'Complete sign-in before joining events.',
  [API_ERROR_CODES.GUILD_MEMBER_SEARCH_DISABLED]:
    'Convoy leader search is unavailable. Enable the Server Members intent for the bot in the Discord Developer Portal.',
  [API_ERROR_CODES.GROUPS_MAXED]: 'This event already has the maximum number of groups.',
  [API_ERROR_CODES.WAITLIST_EMPTY]: 'Could not add a group. Refresh the page and try again.',
  [API_ERROR_CODES.LEADER_ALREADY_IN_LOBBY]:
    'This driver is already in the lobby. Pick someone from the waitlist or a server member who has not joined yet.',
  [API_ERROR_CODES.LEADER_ALREADY_CONVOY_LEADER]:
    'This driver is already a convoy leader in another group.',
};

export function apiErrorMessage(code: ApiErrorCode | ValidationCode, fallback?: string): string {
  if (fallback) return fallback;
  const validation = validationMessageEn(code as ValidationCode);
  if (validation !== code) return validation;
  return API_MESSAGES_EN[code as ApiErrorCode] ?? String(code);
}

export function appErrorResponse(
  req: Request,
  status: number,
  code: ApiErrorCode | ValidationCode,
  message?: string,
): Response {
  return jsonResponse({error: apiErrorMessage(code, message), code}, status, req);
}

export function internalErrorResponse(req: Request, e: unknown): Response {
  console.error(e);
  return appErrorResponse(req, 500, API_ERROR_CODES.INTERNAL);
}

/** Log Postgres/Supabase details server-side; never return `error.message` to clients. */
export function databaseErrorResponse(
  req: Request,
  context: string,
  error: {message?: string},
): Response {
  console.error(JSON.stringify({msg: context, detail: error.message}));
  return appErrorResponse(req, 500, API_ERROR_CODES.INTERNAL);
}
