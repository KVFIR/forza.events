import {isStandaloneBrowser} from './discord';
import {isBrowserWebHost, shouldShowDiscordOnlyGate} from './runtime';

export type ClientSurface = 'activity' | 'browser_web' | 'browser_blocked' | 'unknown';

export const CLIENT_SURFACE_HEADER = 'x-client-surface';

export function resolveClientSurface(): ClientSurface {
  if (typeof window === 'undefined') return 'unknown';
  if (!isStandaloneBrowser()) return 'activity';
  if (shouldShowDiscordOnlyGate()) return 'browser_blocked';
  if (isBrowserWebHost()) return 'browser_web';
  return 'unknown';
}
