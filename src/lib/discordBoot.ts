import {isDiscordActivityFrame} from './supabaseEnv';
import {preloadDiscordEmbeddedSdk} from './preloadDiscordSdk';

/** Warm the Discord SDK chunk after the React shell mounts (Activity iframe only). */
export function runDiscordBootTasks(): void {
  if (!isDiscordActivityFrame()) return;
  preloadDiscordEmbeddedSdk();
}
