import {API_ERROR_CODES, type ApiErrorCode} from './apiErrorCodes.ts';
import {appErrorResponse} from './apiResponse.ts';
import {VALIDATION_CODES, type ValidationCode} from './validationCodes.ts';

const RPC_EXCEPTION_PATTERN =
  /\b(RESULTS_ALREADY_SUBMITTED|PUBLISH_IN_PROGRESS|FORBIDDEN|EVENT_NOT_FOUND|BAD_REQUEST|NOT_DRAFT|GROUPS_MAXED|WAITLIST_EMPTY|LOBBY_NOT_FULL|EVENT_FULL|LEADER_CANNOT_LEAVE|LEADER_ALREADY_CONVOY_LEADER|INVALID_GROUP_INDEX|REGISTRATION_CLOSED|REGISTRATION_AFTER_START)\b/;

const RPC_CODE_TO_API: Record<string, ApiErrorCode> = {
  RESULTS_ALREADY_SUBMITTED: API_ERROR_CODES.RESULTS_ALREADY_SUBMITTED,
  PUBLISH_IN_PROGRESS: API_ERROR_CODES.PUBLISH_IN_PROGRESS,
  FORBIDDEN: API_ERROR_CODES.FORBIDDEN,
  EVENT_NOT_FOUND: API_ERROR_CODES.EVENT_NOT_FOUND,
  BAD_REQUEST: API_ERROR_CODES.BAD_REQUEST,
  NOT_DRAFT: API_ERROR_CODES.NOT_DRAFT,
  GROUPS_MAXED: API_ERROR_CODES.GROUPS_MAXED,
  WAITLIST_EMPTY: API_ERROR_CODES.WAITLIST_EMPTY,
  LOBBY_NOT_FULL: API_ERROR_CODES.LOBBY_NOT_FULL,
  EVENT_FULL: API_ERROR_CODES.EVENT_FULL,
  LEADER_CANNOT_LEAVE: API_ERROR_CODES.LEADER_CANNOT_LEAVE,
  LEADER_ALREADY_CONVOY_LEADER: API_ERROR_CODES.LEADER_ALREADY_CONVOY_LEADER,
  INVALID_GROUP_INDEX: API_ERROR_CODES.BAD_REQUEST,
  REGISTRATION_CLOSED: API_ERROR_CODES.REGISTRATION_CLOSED,
  REGISTRATION_AFTER_START: API_ERROR_CODES.REGISTRATION_AFTER_START,
};

export type RpcPostgresError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

function postgresErrorText(error: RpcPostgresError): string {
  return [error.message, error.details, error.hint].filter(Boolean).join(' ');
}

function httpStatusForApiCode(code: ApiErrorCode | ValidationCode): number {
  if (code === API_ERROR_CODES.TOO_MANY_REQUESTS) return 429;
  if (code === API_ERROR_CODES.RESULTS_ALREADY_SUBMITTED || code === API_ERROR_CODES.EVENT_FULL) {
    return 409;
  }
  if (code === API_ERROR_CODES.FORBIDDEN) return 403;
  if (code === API_ERROR_CODES.EVENT_NOT_FOUND) return 404;
  return 400;
}

/** Extract stable code from Postgres `RAISE EXCEPTION 'CODE'` (via Supabase error.message). */
export function parseRpcExceptionCode(message: string | undefined): ApiErrorCode | null {
  if (!message) return null;
  const match = message.match(RPC_EXCEPTION_PATTERN);
  if (!match) return null;
  return RPC_CODE_TO_API[match[1]] ?? null;
}

/** Map Postgres / PostgREST RPC failures to stable API codes. */
export function parsePostgresRpcErrorCode(
  error: RpcPostgresError,
): ApiErrorCode | ValidationCode | null {
  const fromMessage = parseRpcExceptionCode(error.message);
  if (fromMessage) return fromMessage;

  const text = postgresErrorText(error);
  const fromText = parseRpcExceptionCode(text);
  if (fromText) return fromText;

  // Ambiguous overload (e.g. integer vs smallint) — PostgREST PGRST203.
  if (error.code === 'PGRST203') return API_ERROR_CODES.BAD_REQUEST;

  if (error.code === '23505' && text.includes('ep_one_convoy_leader')) {
    return API_ERROR_CODES.LEADER_ALREADY_CONVOY_LEADER;
  }
  if (error.code === '23505') return API_ERROR_CODES.BAD_REQUEST;

  if (error.code === '23503' && text.includes('event_participants_discord_id_fkey')) {
    return VALIDATION_CODES.CONVOY_LEADER_HANDLE_REQUIRED;
  }

  return null;
}

/** Map Postgres RAISE EXCEPTION messages from security-definer RPCs to API responses. */
export function responseForRpcException(
  req: Request,
  message: string | undefined,
): Response | null {
  const code = parseRpcExceptionCode(message);
  if (!code) return null;
  return appErrorResponse(req, httpStatusForApiCode(code), code);
}

export function responseForRpcError(
  req: Request,
  error: RpcPostgresError,
  fallbackCode: ApiErrorCode = API_ERROR_CODES.INTERNAL,
): Response {
  const code = parsePostgresRpcErrorCode(error);
  if (code) return appErrorResponse(req, httpStatusForApiCode(code), code);

  console.error(
    JSON.stringify({
      msg: 'rpc error',
      code: error.code,
      detail: postgresErrorText(error),
    }),
  );
  return appErrorResponse(req, 500, fallbackCode);
}
