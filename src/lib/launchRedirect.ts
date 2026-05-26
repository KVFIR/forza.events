import type {InitResult} from './discord';

export type LaunchRedirectInput = Pick<InitResult, 'ready' | 'accessToken' | 'launchEventId' | 'guildId'>;

/** Embed button set `custom_id` to `open_event:{id}` — user explicitly opened an event. */
export function hasEmbedLaunchEventId(result: LaunchRedirectInput): boolean {
  return Boolean(result.ready && result.accessToken && result.launchEventId);
}

/** Only embed `open_event:{id}` (or SDK `launchEventId`) — not App Launcher `guildId` alone. */
export function shouldResolveLaunchRedirect(result: LaunchRedirectInput): boolean {
  return hasEmbedLaunchEventId(result);
}

export function resolveLaunchEventTarget(result: LaunchRedirectInput): string | null {
  if (!result.ready || !result.accessToken) return null;
  return result.launchEventId;
}

/** Fallback when the embed button did not pass `custom_id` (see `launch_intents`). Does not block browse. */
export async function resolveLaunchIntentTarget(
  result: LaunchRedirectInput,
  fetchIntent: (token: string, guildId: string) => Promise<string | null>,
): Promise<string | null> {
  if (!result.ready || !result.accessToken || result.launchEventId || !result.guildId) {
    return null;
  }
  return fetchIntent(result.accessToken, result.guildId);
}
