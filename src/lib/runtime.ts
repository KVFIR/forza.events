import {isStandaloneBrowser} from './discord';

/** Local Vite dev server — browser tab is still supported for engineering. */
export function isLocalDevHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

/** Production SPA opened outside Discord (e.g. Railway URL in a tab). */
export function shouldShowDiscordOnlyGate(): boolean {
  return isStandaloneBrowser() && !isLocalDevHost();
}
