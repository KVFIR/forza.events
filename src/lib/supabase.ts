import type {SupabaseClient} from '@supabase/supabase-js';
import {createSupabaseFetch, isDiscordActivityFrame, resolveSupabaseUrl} from './supabaseEnv';

let client: SupabaseClient | null = null;
let clientPromise: Promise<SupabaseClient | null> | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
  );
}

export {resolveSupabaseUrl, isDiscordActivityFrame} from './supabaseEnv';

export async function getSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;

  const url = resolveSupabaseUrl();
  if (!url) return null;

  // PostgREST must not race ahead of Discord URL mapping (Edge invoke already awaits this).
  if (isDiscordActivityFrame()) {
    const {ensureDiscordSupabaseProxy} = await import('./discordUrlProxy');
    await ensureDiscordSupabaseProxy();
  }

  if (client) return client;
  if (!clientPromise) {
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    const customFetch = createSupabaseFetch(anonKey);
    clientPromise = import('@supabase/supabase-js').then(({createClient}) => {
      client = createClient(url, anonKey, customFetch ? {global: {fetch: customFetch}} : undefined);
      return client;
    });
  }
  return clientPromise;
}
