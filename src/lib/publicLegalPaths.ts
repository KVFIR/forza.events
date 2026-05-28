/** Paths that must load in a normal browser tab (Discord app verification, bot install, legal). */
const PUBLIC_BROWSER_PATHS = new Set(['/bot-installed', '/terms', '/privacy']);

export function isPublicLegalBrowserPath(pathname?: string): boolean {
  if (typeof pathname !== 'string') {
    if (typeof window === 'undefined') return false;
    pathname = window.location.pathname;
  }
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return PUBLIC_BROWSER_PATHS.has(normalized);
}
