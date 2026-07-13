import {isLocalDevHost} from './runtime';

/** Localhost-only analytics dashboard (`/analytics`). */
export function isLocalAnalyticsDashboardPath(pathname?: string): boolean {
  if (!isLocalDevHost()) return false;
  if (typeof pathname !== 'string') {
    if (typeof window === 'undefined') return false;
    pathname = window.location.pathname;
  }
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return normalized === '/analytics';
}
