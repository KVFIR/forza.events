export const ANALYTICS_TRACK_SECRET_HEADER = 'x-analytics-track-secret';

export function trackSecretMatches(
  provided: string | null,
  expected: string | undefined,
): boolean {
  const secret = expected?.trim();
  if (!secret) return false;
  const raw = provided?.trim();
  return Boolean(raw && raw === secret);
}

/** When expected secret is set, client must send the matching header. */
export function trackSecretConfiguredOk(
  provided: string | null,
  expected: string | undefined,
): boolean {
  const secret = expected?.trim();
  if (!secret) return true;
  return trackSecretMatches(provided, secret);
}

/** When ANALYTICS_TRACK_SECRET is set on Edge, client must send the matching header. */
export function trackSecretOk(req: Request): boolean {
  return trackSecretConfiguredOk(
    req.headers.get(ANALYTICS_TRACK_SECRET_HEADER),
    Deno.env.get('ANALYTICS_TRACK_SECRET') ?? undefined,
  );
}
