import {isStandaloneBrowser} from './discord';
import {isPublicLegalBrowserPath} from './publicLegalPaths';

/** Local Vite dev server — browser tab is still supported for engineering. */
export function isLocalDevHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

function appOriginHostname(): string | null {
  const raw = import.meta.env.VITE_APP_ORIGIN as string | undefined;
  if (!raw?.trim()) return null;
  try {
    return new URL(raw.trim()).hostname;
  } catch {
    return null;
  }
}

/** Hosts where the SPA may run in a normal browser tab (localhost + production web). */
export function isBrowserWebHost(): boolean {
  if (isLocalDevHost()) return true;
  if (typeof window === 'undefined') return false;

  const host = window.location.hostname;
  if (host === 'forza.events' || host === 'www.forza.events') return true;

  const originHost = appOriginHostname();
  return Boolean(originHost && originHost === host);
}

/** Browser OAuth (Discord authorize → /auth/callback) is available on web hosts. */
export function supportsBrowserOAuth(): boolean {
  return isBrowserWebHost();
}

/**
 * Hard full-screen sign-in gate is off: guests may browse on web hosts.
 * Soft-prompt at Join / Create / Profile / My Events (`SignInRequiredState` / Join CTA).
 * Discord Activity iframe still uses embedded SDK auth.
 */
export function shouldRequireBrowserSignIn(): boolean {
  return false;
}

/**
 * Guest-readable paths on browser web hosts (showcase + OAuth return + legal).
 * Create / Profile / My Events soft-gate in-screen; `/sign-in` is handled in App.
 */
export function isPublicBrowserPath(pathname?: string): boolean {
  if (isPublicLegalBrowserPath(pathname)) return true;
  if (typeof pathname !== 'string') {
    if (typeof window === 'undefined') return false;
    pathname = window.location.pathname;
  }
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (normalized === '/auth/callback') return true;
  if (normalized === '/' || normalized === '/leaderboard') return true;
  if (normalized === '/bot-installed') return true;
  // /event/:slugOrId and /event/:slugOrId/results (UUID still resolves)
  if (/^\/event\/[^/]+(?:\/results)?$/.test(normalized)) return true;
  return false;
}

/** Production SPA opened outside Discord on an unsupported host (e.g. raw Railway URL). */
export function shouldShowDiscordOnlyGate(): boolean {
  if (typeof window !== 'undefined' && isPublicLegalBrowserPath()) {
    return false;
  }
  return isStandaloneBrowser() && !isBrowserWebHost();
}
