import {fetchLaunchIntent, isApiConfigured} from './api';
import {applyEmbedLaunchRoute, completeActivityLaunchResolution} from './activityLaunch';
import {eventIdFromOpenEventCustomId} from './eventLaunch';

type ResolveInput = {
  sdkCustomId: string | null;
  accessToken: string | null;
  guildId: string | null;
};

/**
 * Resolves embed deep link after `sdk.ready()` and OAuth.
 * Unblocks browse only when this is a normal App Launcher session.
 */
export async function resolveActivityLaunchAfterAuth({
  sdkCustomId,
  accessToken,
  guildId,
}: ResolveInput): Promise<string | null> {
  let launchEventId = eventIdFromOpenEventCustomId(sdkCustomId);

  if (launchEventId) {
    applyEmbedLaunchRoute(launchEventId);
    completeActivityLaunchResolution(true);
    return launchEventId;
  }

  if (accessToken && guildId && isApiConfigured()) {
    const fromIntent = await fetchLaunchIntent(accessToken, guildId);
    if (fromIntent) {
      launchEventId = fromIntent;
      applyEmbedLaunchRoute(launchEventId);
      completeActivityLaunchResolution(true);
      return launchEventId;
    }
  }

  completeActivityLaunchResolution(false);
  return null;
}
