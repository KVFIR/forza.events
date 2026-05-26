import {patchUrlMappings} from '@discord/embedded-app-sdk';
import {DISCORD_SUPABASE_PROXY_PREFIX, isDiscordActivityFrame} from './supabaseEnv';

/**
 * Rewrite *.supabase.co requests to {origin}/supabase (must match Developer Portal mapping).
 * createClient keeps the real project URL so PostgREST accepts the anon JWT.
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
