import type {InitResult} from './discord';

export type LaunchRedirectInput = Pick<InitResult, 'ready' | 'accessToken' | 'launchEventId' | 'guildId'>;

/** Embed button set `custom_id` to `open_event:{id}` — user explicitly opened an event. */
export function hasEmbedLaunchEventId(result: LaunchRedirectInput): boolean {
  return Boolean(result.ready && result.accessToken && result.launchEventId);
}

/** Try embed id first, then recent `launch_intents` row (fallback when custom_id is missing). */
export function shouldResolveLaunchRedirect(result: LaunchRedirectInput): boolean {
  return Boolean(
    result.ready && result.accessToken && (result.launchEventId || result.guildId),
  );
}

export async function resolveLaunchEventTarget(
  result: LaunchRedirectInput,
  fetchIntent: (token: string, guildId: string) => Promise<string | null>,
): Promise<string | null> {
  if (!result.ready || !result.accessToken) return null;
  if (result.launchEventId) return result.launchEventId;
  if (result.guildId) return fetchIntent(result.accessToken, result.guildId);
  return null;
}
