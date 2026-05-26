/** Discord Activity URL mapping prefix (must match Developer Portal). */
export const DISCORD_SUPABASE_PROXY_PREFIX = '/supabase';

/** Local Vite dev — read PostgREST directly (skip Edge) so Browse works without function deploy. */
export function shouldUseDirectSupabaseReads(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return true;
  return !isDiscordActivityFrame();
}

export function isDiscordActivityFrame(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.parent !== window;
  } catch {
    return true;
  }
}

/** Canonical Supabase project URL (always *.supabase.co — never discordsays.com). */
export function resolveSupabaseUrl(): string | null {
  const raw = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!raw?.trim()) return null;
  return raw.trim().replace(/\/$/, '');
}

/** Ensure apikey headers survive Discord proxy; URL rewrite is handled by patchUrlMappings. */
export function createSupabaseFetch(anonKey: string): typeof fetch | undefined {
  if (!isDiscordActivityFrame()) return undefined;

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
