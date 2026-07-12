import {API_ERROR_CODES, type ApiErrorCode} from './apiErrorCodes.ts';
import {appErrorResponse} from './apiResponse.ts';

const RPC_EXCEPTION_PATTERN =
  /\b(RESULTS_ALREADY_SUBMITTED|PUBLISH_IN_PROGRESS|FORBIDDEN|EVENT_NOT_FOUND|BAD_REQUEST|NOT_DRAFT|GROUPS_MAXED|WAITLIST_EMPTY|LOBBY_NOT_FULL)\b/;

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
};

/** Extract stable code from Postgres `RAISE EXCEPTION 'CODE'` (via Supabase error.message). */
export function parseRpcExceptionCode(message: string | undefined): ApiErrorCode | null {
  if (!message) return null;
  const match = message.match(RPC_EXCEPTION_PATTERN);
  if (!match) return null;
  return RPC_CODE_TO_API[match[1]] ?? null;
}

/** Map Postgres RAISE EXCEPTION messages from security-definer RPCs to API responses. */
export function responseForRpcException(
  req: Request,
  message: string | undefined,
): Response | null {
  const code = parseRpcExceptionCode(message);
  if (!code) return null;

  const status =
    code === API_ERROR_CODES.RESULTS_ALREADY_SUBMITTED
      ? 409
      : code === API_ERROR_CODES.FORBIDDEN
        ? 403
        : code === API_ERROR_CODES.EVENT_NOT_FOUND
          ? 404
          : 400;

  return appErrorResponse(req, status, code);
}

export function responseForRpcError(
  req: Request,
  error: {message?: string},
  fallbackCode: ApiErrorCode = API_ERROR_CODES.INTERNAL,
): Response {
  const mapped = responseForRpcException(req, error.message);
  if (mapped) return mapped;
  console.error(JSON.stringify({msg: 'rpc error', detail: error.message}));
  return appErrorResponse(req, 500, fallbackCode);
}
