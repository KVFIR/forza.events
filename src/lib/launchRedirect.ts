import type {InitResult} from './discord';

export type LaunchRedirectInput = Pick<InitResult, 'ready' | 'accessToken' | 'launchEventId' | 'guildId'>;

/** Embed button set `custom_id` to `open_event:{id}`. */
export function hasEmbedLaunchEventId(result: LaunchRedirectInput): boolean {
  return Boolean(result.ready && result.accessToken && result.launchEventId);
}

export function shouldResolveLaunchRedirect(result: LaunchRedirectInput): boolean {
  return Boolean(
    result.ready && result.accessToken && (result.launchEventId || result.guildId),
  );
}

/**
 * Guild launch-intent redirect only from browse home so auth finishing in the background
 * does not replace a deep link the user already opened. Embed `open_event:{id}` always applies.
 */
export function shouldApplyLaunchRedirectAtPath(
  pathname: string,
  result: LaunchRedirectInput,
): boolean {
  if (hasEmbedLaunchEventId(result)) return true;
  return pathname === '/' || pathname === '';
}

export async function resolveLaunchEventTarget(
  result: LaunchRedirectInput,
  fetchIntent: (token: string, guildId: string | null) => Promise<string | null>,
): Promise<string | null> {
  if (!result.ready || !result.accessToken) return null;
  if (result.launchEventId) return result.launchEventId;
  if (result.guildId) return fetchIntent(result.accessToken, result.guildId);
  return fetchIntent(result.accessToken, null);
}

export async function applyLaunchEventRedirect(
  result: LaunchRedirectInput,
  options: {
    isConfigured: boolean;
    pathname: string;
    navigate: (path: string, options: {replace: boolean}) => void;
    cancelled: () => boolean;
    fetchIntent: (token: string, guildId: string | null) => Promise<string | null>;
  },
): Promise<void> {
  const {isConfigured, pathname, navigate, cancelled, fetchIntent} = options;
  if (!isConfigured || !shouldResolveLaunchRedirect(result)) return;
  if (!shouldApplyLaunchRedirectAtPath(pathname, result)) return;

  const target = await resolveLaunchEventTarget(result, fetchIntent);
  if (target && !cancelled()) {
    navigate(`/event/${target}`, {replace: true});
  }
}
