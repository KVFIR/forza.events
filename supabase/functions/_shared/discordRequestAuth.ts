import {API_ERROR_CODES} from './apiErrorCodes.ts';
import {appErrorResponse} from './apiResponse.ts';
import {
  discordAccessTokenFrom,
  isDiscordRateLimitError,
  verifyDiscordToken,
  type DiscordUser,
} from './discord.ts';

export type DiscordAuthOk = {user: DiscordUser; token: string};

/**
 * Required Discord user auth for mutation/auth Edge handlers.
 * Maps DiscordRateLimitError → 503 TOO_MANY_REQUESTS (safe before outer try/catch).
 */
export async function requireDiscordUser(
  req: Request,
): Promise<DiscordAuthOk | Response> {
  try {
    const token = discordAccessTokenFrom(req);
    const user = await verifyDiscordToken(token);
    if (!user || !token) {
      return appErrorResponse(req, 401, API_ERROR_CODES.UNAUTHORIZED);
    }
    return {user, token};
  } catch (e) {
    if (isDiscordRateLimitError(e)) {
      return appErrorResponse(req, 503, API_ERROR_CODES.TOO_MANY_REQUESTS);
    }
    throw e;
  }
}

/**
 * Optional Discord auth (e.g. browse feed). Same rate-limit mapping when a token is present.
 */
export async function optionalDiscordUser(
  req: Request,
): Promise<DiscordUser | null | Response> {
  try {
    return await verifyDiscordToken(discordAccessTokenFrom(req));
  } catch (e) {
    if (isDiscordRateLimitError(e)) {
      return appErrorResponse(req, 503, API_ERROR_CODES.TOO_MANY_REQUESTS);
    }
    throw e;
  }
}
