import {eventIdFromOpenEventCustomId} from './eventLaunch';
import {isDiscordActivityFrame} from './supabaseEnv';

const EMBED_LAUNCH_ROUTE_EVENT = 'forza:embed-launch-route';

function isStandaloneBrowser(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.parent === window;
  } catch {
    return false;
  }
}

/** Discord injects `custom_id` into the Activity iframe URL when launched from a message button. */
export function readEmbedLaunchEventIdFromSearch(search: string): string | null {
  const raw = new URLSearchParams(search).get('custom_id');
  if (!raw) return null;

  let customId = raw;
  try {
    customId = decodeURIComponent(raw);
  } catch {
    // keep raw
  }

  return eventIdFromOpenEventCustomId(customId);
}

function readEmbedLaunchEventIdFromLocation(): string | null {
  if (typeof window === 'undefined' || isStandaloneBrowser()) return null;
  return readEmbedLaunchEventIdFromSearch(window.location.search);
}

let deferBrowseFeed = false;
/** True until `sdk.ready()` confirms there is no embed `customId` (avoids browse flash when URL omits it). */
let pendingEmbedSdkProbe = false;

function syncHistoryToEventRoute(eventId: string): void {
  const target = `/event/${eventId}`;
  if (window.location.pathname === target) return;

  window.history.replaceState(window.history.state, '', `${target}${window.location.search}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/** Call from `main.tsx` before React mounts. */
export function bootstrapActivityLaunch(): void {
  if (typeof window === 'undefined' || !isDiscordActivityFrame()) return;

  const fromUrl = readEmbedLaunchEventIdFromSearch(window.location.search);
  if (fromUrl) {
    deferBrowseFeed = true;
    syncHistoryToEventRoute(fromUrl);
    return;
  }

  pendingEmbedSdkProbe = true;
}

/** After `sdk.ready()` when `sdk.customId` is `open_event:{id}`. */
export function applyEmbedLaunchRoute(eventId: string): void {
  if (isStandaloneBrowser()) return;

  deferBrowseFeed = true;
  pendingEmbedSdkProbe = false;
  syncHistoryToEventRoute(eventId);
  window.dispatchEvent(new CustomEvent(EMBED_LAUNCH_ROUTE_EVENT, {detail: {eventId}}));
}

/** No embed `customId` after `sdk.ready()` while probe was pending — allow browse to load. */
export function finishEmbedSdkProbe(): void {
  if (!pendingEmbedSdkProbe) return;
  pendingEmbedSdkProbe = false;
  deferBrowseFeed = false;
}

/** Skip the public browse feed on embed launch (URL or SDK). */
export function shouldDeferBrowseFeed(): boolean {
  return deferBrowseFeed || pendingEmbedSdkProbe;
}

export function endDeferBrowseFeed(): void {
  deferBrowseFeed = false;
  pendingEmbedSdkProbe = false;
}

export function getEmbedLaunchEventIdFromLocation(): string | null {
  return readEmbedLaunchEventIdFromLocation();
}

export function subscribeEmbedLaunchRoute(onRoute: (eventId: string) => void): () => void {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<{eventId: string}>).detail;
    if (detail?.eventId) onRoute(detail.eventId);
  };
  window.addEventListener(EMBED_LAUNCH_ROUTE_EVENT, handler);
  return () => window.removeEventListener(EMBED_LAUNCH_ROUTE_EVENT, handler);
}
