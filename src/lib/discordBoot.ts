import {isDiscordActivityFrame} from './supabaseEnv';
import {setupDiscordSupabaseProxy} from './discordUrlProxy';
import {preloadDiscordEmbeddedSdk} from './preloadDiscordSdk';

/** Non-blocking Discord Activity warm-up after the React shell mounts. */
export function runDiscordBootTasks(): void {
  if (!isDiscordActivityFrame()) return;
  setupDiscordSupabaseProxy();
  preloadDiscordEmbeddedSdk();
}
