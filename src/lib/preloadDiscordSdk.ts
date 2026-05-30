import {isDiscordActivityFrame} from './supabaseEnv';

let preloadStarted = false;

/** Warm the Discord SDK chunk while the app shell mounts (Activity iframe only). */
export function preloadDiscordEmbeddedSdk(): void {
  if (preloadStarted || !isDiscordActivityFrame()) return;
  preloadStarted = true;
  void import('@discord/embedded-app-sdk');
}
