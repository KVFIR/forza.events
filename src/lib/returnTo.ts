const AUTH_RETURN_KEY = 'forza.auth_return_to';

/** Keep in sync with authenticated routes in `src/App.tsx` (plus public legal pages). */
const ALLOWED_EXACT = new Set([
  '/',
  '/my-events',
  '/create',
  '/profile',
  '/bot-installed',
  '/terms',
  '/privacy',
]);

function normalizedPathOnly(path: string): string {
  const pathOnly = path.split('?')[0].split('#')[0];
  return pathOnly.replace(/\/+$/, '') || '/';
}

/** Block OAuth loops, unknown routes, and open redirects. */
export function isSafeReturnPath(path: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  const normalized = normalizedPathOnly(path);
  if (normalized === '/auth/callback' || normalized.startsWith('/auth/')) return false;
  if (normalized === '/sign-in') return false;
  if (ALLOWED_EXACT.has(normalized)) return true;
  if (normalized.startsWith('/event/')) return true;
  return false;
}

export function saveAuthReturnTo(path: string): void {
  if (typeof sessionStorage === 'undefined' || !isSafeReturnPath(path)) return;
  sessionStorage.setItem(AUTH_RETURN_KEY, path);
}

export function clearAuthReturnTo(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(AUTH_RETURN_KEY);
}

export function consumeAuthReturnTo(fallback = '/'): string {
  if (typeof sessionStorage === 'undefined') return fallback;
  const raw = sessionStorage.getItem(AUTH_RETURN_KEY);
  sessionStorage.removeItem(AUTH_RETURN_KEY);
  if (raw && isSafeReturnPath(raw)) return raw;
  return fallback;
}

/** Safe list referrer for `location.state` (pathname only; query stripped). */
export function sanitizeReferrer(from?: string): string | undefined {
  if (!from || !isSafeReturnPath(from)) return undefined;
  return normalizedPathOnly(from);
}

export function eventDetailBackTo(
  from: string | undefined,
  opts: {isDraft: boolean; isHost: boolean},
): string {
  const referrer = sanitizeReferrer(from);
  if (referrer) return referrer;
  if (opts.isDraft && opts.isHost) return '/my-events';
  return '/';
}
