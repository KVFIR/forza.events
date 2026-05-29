import {adminClient} from './supabase.ts';

/**
 * Global rate limit via Postgres (`check_api_rate_limit` RPC).
 * Fail-closed: deny when RPC is unavailable (no per-isolate memory fallback).
 */
export async function enforceRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const supabase = adminClient();
    const {data, error} = await supabase.rpc('check_api_rate_limit', {
      p_key: key,
      p_max: maxRequests,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error(JSON.stringify({msg: 'enforceRateLimit rpc failed', key, detail: error.message}));
      return false;
    }
    return data === true;
  } catch (e) {
    console.error(
      JSON.stringify({
        msg: 'enforceRateLimit failed',
        key,
        error: e instanceof Error ? e.message : String(e),
      }),
    );
    return false;
  }
}

export async function rateLimitOr429(
  req: Request,
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<Response | null> {
  const ok = await enforceRateLimit(key, maxRequests, windowSeconds);
  if (ok) return null;
  const {appErrorResponse} = await import('./apiResponse.ts');
  const {API_ERROR_CODES} = await import('./apiErrorCodes.ts');
  return appErrorResponse(req, 429, API_ERROR_CODES.TOO_MANY_REQUESTS);
}
