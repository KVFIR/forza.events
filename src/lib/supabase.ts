import type {SupabaseClient} from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
let clientPromise: Promise<SupabaseClient | null> | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
  );
}

export async function getSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;
  if (client) return client;
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({createClient}) => {
      client = createClient(
        import.meta.env.VITE_SUPABASE_URL as string,
        import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      );
      return client;
    });
  }
  return clientPromise;
}
