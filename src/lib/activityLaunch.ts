import {eventIdFromOpenEventCustomId} from './eventLaunch';

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
  const customId = new URLSearchParams(search).get('custom_id');
  return eventIdFromOpenEventCustomId(customId);
}

function readEmbedLaunchEventIdFromLocation(): string | null {
  if (typeof window === 'undefined' || isStandaloneBrowser()) return null;
  return readEmbedLaunchEventIdFromSearch(window.location.search);
}

let deferBrowseFeed = Boolean(readEmbedLaunchEventIdFromLocation());

/** Skip the public browse feed on first load when opening from an embed `open_event:` button. */
export function shouldDeferBrowseFeed(): boolean {
  return deferBrowseFeed;
}

/** Call after routing to the embed target (or when browse should load normally). */
export function endDeferBrowseFeed(): void {
  deferBrowseFeed = false;
}

export function getEmbedLaunchEventIdFromLocation(): string | null {
  return readEmbedLaunchEventIdFromLocation();
}
