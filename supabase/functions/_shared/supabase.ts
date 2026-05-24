import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.49.1';

export function adminClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key, {auth: {persistSession: false}});
}
