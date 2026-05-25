/** Discord Activity URL mapping prefix (must match Developer Portal). */
export const DISCORD_SUPABASE_PROXY_PREFIX = '/supabase';

function isDiscordActivityFrame(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.parent !== window;
  } catch {
    return true;
  }
}

/** Supabase REST/Realtime/Functions base URL (Discord proxy path in Activity iframe). */
export function resolveSupabaseUrl(): string | null {
  const raw = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!raw?.trim()) return null;

  if (isDiscordActivityFrame()) {
    return `${window.location.origin}${DISCORD_SUPABASE_PROXY_PREFIX}`;
  }

  return raw.trim().replace(/\/$/, '');
}
