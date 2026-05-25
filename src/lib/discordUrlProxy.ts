import {patchUrlMappings} from '@discord/embedded-app-sdk';
import {DISCORD_SUPABASE_PROXY_PREFIX} from './supabaseEnv';

function isDiscordActivityFrame(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.parent !== window;
  } catch {
    return true;
  }
}

/**
 * Fallback: rewrite any direct *.supabase.co requests (e.g. third-party code).
 * Primary path uses resolveSupabaseUrl() so the client talks to /supabase on discordsays.com.
 */
export function setupDiscordSupabaseProxy(): void {
  if (!isDiscordActivityFrame()) return;

  const raw = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!raw?.trim()) return;

  let host: string;
  try {
    host = new URL(raw.trim()).host;
  } catch {
    return;
  }

  patchUrlMappings([{prefix: DISCORD_SUPABASE_PROXY_PREFIX, target: host}]);
}

export const discordSupabaseProxyPrefix = DISCORD_SUPABASE_PROXY_PREFIX;
