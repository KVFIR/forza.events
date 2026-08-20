import {API_ERROR_CODES} from './apiErrorCodes';
import {VALIDATION_CODES} from './validationCodes';

export type AnalyticsErrorClass = 'bug' | 'auth' | 'noise' | 'expected' | 'watch';

export type ClassifiableError = {
  code: string;
  function_name?: string | null;
  http_status?: number | null;
  count: number;
  distinct_ts?: number;
};

export const ERROR_CLASS_LABEL: Record<AnalyticsErrorClass, string> = {
  bug: 'bug',
  auth: 'auth',
  noise: 'noise',
  expected: 'expected',
  watch: 'watch',
};

const EXPECTED_API_CODES = new Set<string>([
  API_ERROR_CODES.FORBIDDEN,
  API_ERROR_CODES.NOT_FOUND,
  API_ERROR_CODES.BOT_NOT_IN_GUILD,
  API_ERROR_CODES.CHANNEL_NOT_FOUND,
  API_ERROR_CODES.CHANNEL_NOT_TEXT,
  API_ERROR_CODES.CHANNEL_NOT_VOICE,
  API_ERROR_CODES.CHANNEL_WRONG_GUILD,
  API_ERROR_CODES.BOT_NOT_GUILD_MEMBER,
  API_ERROR_CODES.BOT_CANNOT_POST,
  API_ERROR_CODES.EVENT_FULL,
  API_ERROR_CODES.REGISTRATION_CLOSED,
  API_ERROR_CODES.REGISTRATION_AFTER_START,
  API_ERROR_CODES.HOST_CANNOT_JOIN,
  API_ERROR_CODES.LEADER_CANNOT_LEAVE,
  API_ERROR_CODES.LEADER_CANNOT_MOVE,
  API_ERROR_CODES.EVENT_NOT_FOUND,
  API_ERROR_CODES.NOT_DRAFT,
  API_ERROR_CODES.RESULTS_PARTICIPANTS_ONLY,
  API_ERROR_CODES.RESULTS_NOT_IN_GUILD,
  API_ERROR_CODES.PUBLISH_IN_PROGRESS,
  API_ERROR_CODES.RESULTS_ALREADY_SUBMITTED,
  API_ERROR_CODES.PROFILE_INCOMPLETE,
  API_ERROR_CODES.GUILD_MEMBER_SEARCH_DISABLED,
  API_ERROR_CODES.GROUPS_MAXED,
  API_ERROR_CODES.WAITLIST_EMPTY,
  API_ERROR_CODES.LEADER_ALREADY_IN_LOBBY,
  API_ERROR_CODES.LEADER_ALREADY_CONVOY_LEADER,
  API_ERROR_CODES.LOBBY_NOT_FULL,
  VALIDATION_CODES.CONVOY_LEADER_NOT_IN_GUILD,
  VALIDATION_CODES.CONVOY_LEADER_REQUIRED,
  VALIDATION_CODES.CONVOY_LEADER_DISCORD_REQUIRED,
  VALIDATION_CODES.CONVOY_LEADER_HANDLE_REQUIRED,
  VALIDATION_CODES.TITLE_REQUIRED,
  VALIDATION_CODES.TYPE_REQUIRED,
  VALIDATION_CODES.STARTS_AT_REQUIRED,
  VALIDATION_CODES.GUILD_REQUIRED,
  VALIDATION_CODES.CHANNEL_REQUIRED,
  VALIDATION_CODES.CARS_REQUIRED,
  VALIDATION_CODES.CARS_UNRESOLVED,
  VALIDATION_CODES.PI_RANGE,
  VALIDATION_CODES.TARGET_GUILD_LOCKED,
  VALIDATION_CODES.TARGET_CHANNEL_LOCKED,
  VALIDATION_CODES.GAME_LOCKED,
  VALIDATION_CODES.RANKED_TYPE_NOT_ALLOWED,
  VALIDATION_CODES.RANKED_GUILD_REQUIRED,
  VALIDATION_CODES.RANKED_GUILD_NOT_ALLOWED,
  VALIDATION_CODES.RANKED_LOCKED,
  VALIDATION_CODES.TRACK_NAME_REQUIRED,
  VALIDATION_CODES.TRACK_SHARE_CODE_INVALID,
  VALIDATION_CODES.TRACK_FORMAT_TOO_LONG,
  VALIDATION_CODES.TRACKS_TOO_MANY,
]);

export function classifyApiError(
  code: string,
  httpStatus?: number | null,
  functionName?: string | null,
): AnalyticsErrorClass {
  switch (code) {
    case API_ERROR_CODES.INTERNAL:
      return 'bug';
    case API_ERROR_CODES.NETWORK_ERROR:
    case API_ERROR_CODES.TOO_MANY_REQUESTS:
      return 'noise';
    case API_ERROR_CODES.UNAUTHORIZED:
      return 'auth';
    case API_ERROR_CODES.INVALID_RESPONSE:
      return httpStatus != null && httpStatus >= 500 ? 'bug' : 'watch';
    case API_ERROR_CODES.BAD_REQUEST:
      return functionName === 'token-exchange' ? 'auth' : 'expected';
    case VALIDATION_CODES.CONVOY_LEADER_GUILD_CHECK_FAILED:
    case VALIDATION_CODES.CARS_SYNC_FAILED:
      return 'watch';
    default:
      return EXPECTED_API_CODES.has(code) ? 'expected' : 'watch';
  }
}

export function classifiedCount(
  rows: ClassifiableError[],
  cls: AnalyticsErrorClass,
): number {
  return rows.reduce(
    (sum, row) =>
      classifyApiError(row.code, row.http_status, row.function_name) === cls
        ? sum + row.count
        : sum,
    0,
  );
}

export type ErrorHeadline = {
  title: string;
  body: string;
  tone: 'ok' | 'info' | 'warning' | 'danger';
};

/** One-line brief a human can act on — Activity bugs first, then auth, then noise. */
export function buildErrorHeadline(input: {
  apiErrors: number;
  totalEvents: number;
  activityErrors: number;
  sessionExpired: number;
  top: ClassifiableError[];
}): ErrorHeadline {
  const {apiErrors, totalEvents, activityErrors, sessionExpired, top} = input;
  if (apiErrors === 0) {
    return {
      title: 'All clear',
      body: 'No API errors in this window.',
      tone: 'ok',
    };
  }

  const bugs = classifiedCount(top, 'bug');
  const auth = classifiedCount(top, 'auth');
  const watch = classifiedCount(top, 'watch');
  const noise = classifiedCount(top, 'noise');
  const expected = classifiedCount(top, 'expected');
  const pct = totalEvents > 0 ? ((100 * apiErrors) / totalEvents).toFixed(1) : '0';

  if (bugs > 0 && activityErrors > 0) {
    return {
      title: 'Activity bugs',
      body: `${bugs} gateway/app failures and ${activityErrors} Activity errors. Start there — not the browser_web pile.`,
      tone: 'danger',
    };
  }
  if (bugs > 0) {
    return {
      title: 'Gateway / parse failures',
      body: `${bugs} INTERNAL or 5xx INVALID_RESPONSE rows. Activity is ${activityErrors}.`,
      tone: 'danger',
    };
  }
  if (auth + sessionExpired >= watch && (auth > 0 || sessionExpired > 0)) {
    return {
      title: 'Browser sessions expiring',
      body: `${auth} UNAUTHORIZED + ${sessionExpired} session_expired. Activity errors: ${activityErrors}. Refresh covers tokens with a refresh_token; the rest need a re-login.`,
      tone: 'warning',
    };
  }
  if (watch > 0) {
    return {
      title: 'Watch INVALID_RESPONSE',
      body: `${watch} non-JSON or unexpected bodies (often HTTP 200). Confirm forza.events vs localhost before treating as product.`,
      tone: 'warning',
    };
  }
  if (activityErrors === 0 && (noise > 0 || expected > 0)) {
    return {
      title: 'Noise only',
      body: `${apiErrors} api_error (${pct}% of events), all browser_web. Network blips and expected validation — not a Discord incident.`,
      tone: 'info',
    };
  }
  return {
    title: 'API errors',
    body: `${apiErrors} rows (${pct}% of events). Activity: ${activityErrors}.`,
    tone: 'warning',
  };
}

/** Ignore network/validation volume when coloring the health watch. */
export function apiErrorHealthStatus(input: {
  apiErrors: number;
  activityErrors: number;
  top: ClassifiableError[];
}): 'ok' | 'warn' | 'critical' {
  if (input.apiErrors === 0) return 'ok';
  const bugs = classifiedCount(input.top, 'bug');
  const watch = classifiedCount(input.top, 'watch');
  const auth = classifiedCount(input.top, 'auth');
  if (bugs > 0 && input.activityErrors > 0) return 'critical';
  if (bugs > 0 || watch > 0) return 'warn';
  if (auth > 0) return 'warn';
  if (input.activityErrors > classifiedCount(input.top, 'expected')) return 'warn';
  return 'ok';
}
