import type {InitResult} from './discord';

export type LaunchRedirectInput = Pick<InitResult, 'ready' | 'accessToken' | 'launchEventId' | 'guildId'>;

export function hasLaunchRedirectHint(result: LaunchRedirectInput): boolean {
  return Boolean(result.ready && result.accessToken && (result.launchEventId || result.guildId));
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
