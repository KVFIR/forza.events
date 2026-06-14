import {DISCORD_SUPABASE_PROXY_PREFIX, isDiscordActivityFrame} from './supabaseEnv';

let proxyPatched = false;
let proxyPatchPromise: Promise<void> | null = null;

/**
 * Rewrite *.supabase.co requests to {origin}/supabase (must match Developer Portal mapping).
 * Dynamic import keeps the Discord SDK chunk off the critical path for first paint (mobile cold start).
 */
export function ensureDiscordSupabaseProxy(): Promise<void> {
  if (!isDiscordActivityFrame() || proxyPatched) return Promise.resolve();
  if (proxyPatchPromise) return proxyPatchPromise;

  proxyPatchPromise = (async () => {
    const raw = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    if (!raw?.trim()) return;

    let host: string;
    try {
      host = new URL(raw.trim()).host;
    } catch {
      return;
    }

    const {patchUrlMappings} = await import('@discord/embedded-app-sdk');
    patchUrlMappings([{prefix: DISCORD_SUPABASE_PROXY_PREFIX, target: host}]);
    proxyPatched = true;
  })().catch((err) => {
    proxyPatchPromise = null;
    console.error('Discord Supabase URL proxy setup failed', err);
    throw err;
  });

  return proxyPatchPromise;
}

/** Fire-and-forget helper for post-mount boot (see `discordBoot.ts`). */
export function setupDiscordSupabaseProxy(): void {
  void ensureDiscordSupabaseProxy();
}
