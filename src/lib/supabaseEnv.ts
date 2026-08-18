import {isBrowserWebHost} from './runtime';

/** Discord Activity URL mapping prefix (must match Developer Portal + Caddyfile). */
export const DISCORD_SUPABASE_PROXY_PREFIX = '/supabase';

/** Route API/Storage through the app origin (Vite dev proxy or production Caddy). */
export function shouldProxySupabaseThroughOrigin(): boolean {
  return isBrowserWebHost();
}

/** Local Vite dev only — read PostgREST directly (skip Edge) so Browse works without function deploy. */
export function shouldUseDirectSupabaseReads(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

export function isDiscordActivityFrame(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.parent !== window;
  } catch {
    return true;
  }
}

/**
 * PostgREST `getSupabase().from()` is usable in the browser (Vite, Worker, Activity).
 * Public event/result reads still go Edge-first; this only gates the REST fallback.
 * Worker REST 401s only when `apikey` is missing — not a reason to skip fallback.
 */
export function canUsePostgrestReads(): boolean {
  return typeof window !== 'undefined';
}

function directSupabaseUrl(): string | null {
  const raw = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!raw?.trim()) return null;
  return raw.trim().replace(/\/$/, '');
}

/** Client Supabase/API base — proxied on browser web hosts, direct in Discord Activity iframe. */
export function resolveSupabaseUrl(): string | null {
  const direct = directSupabaseUrl();
  if (!direct) return null;

  if (typeof window !== 'undefined' && shouldProxySupabaseThroughOrigin()) {
    return `${window.location.origin}${DISCORD_SUPABASE_PROXY_PREFIX}`;
  }

  return direct;
}

/** Project host from env (for rewriting Storage URLs to the origin proxy). */
export function supabaseProjectHost(): string | null {
  const direct = directSupabaseUrl();
  if (!direct) return null;
  try {
    return new URL(direct).host;
  } catch {
    return null;
  }
}

/** Re-apply apikey after Discord / origin proxies that drop auth headers. */
export function createSupabaseFetch(anonKey: string): typeof fetch | undefined {
  if (typeof window === 'undefined') return undefined;
  if (!isDiscordActivityFrame() && !shouldProxySupabaseThroughOrigin()) return undefined;

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(input instanceof Request ? input.headers : init?.headers);
    headers.set('apikey', anonKey);
    headers.set('Authorization', `Bearer ${anonKey}`);

    if (input instanceof Request) {
      return fetch(new Request(input, {...init, headers}));
    }
    return fetch(input, {...init, headers});
  };
}
