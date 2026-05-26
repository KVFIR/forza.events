import {adminClient} from './supabase.ts';

const buckets = new Map<string, {count: number; resetAt: number}>();

/** In-memory fallback when Postgres rate limit is unavailable. */
function rateLimitMemory(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now >= entry.resetAt) {
    buckets.set(key, {count: 1, resetAt: now + windowMs});
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count += 1;
  return true;
}

/**
 * Global rate limit via Postgres (`check_api_rate_limit` RPC).
 * Falls back to per-isolate memory on error.
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
      console.error('enforceRateLimit rpc', error);
      return rateLimitMemory(key, maxRequests, windowSeconds * 1000);
    }
    return data === true;
  } catch (e) {
    console.error('enforceRateLimit', e);
    return rateLimitMemory(key, maxRequests, windowSeconds * 1000);
  }
}

/** @deprecated Use enforceRateLimit */
export function rateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  return rateLimitMemory(key, maxRequests, windowMs);
}

export async function rateLimitOr429(
  req: Request,
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<Response | null> {
  const ok = await enforceRateLimit(key, maxRequests, windowSeconds);
  if (ok) return null;
  const {jsonResponse} = await import('./cors.ts');
  return jsonResponse({error: 'Too many requests'}, 429, req);
}
