import {defineConfig, loadEnv} from 'vite';
import react from '@vitejs/plugin-react';

/** Map canonical server-side env names to VITE_* client vars (single .env file). */
function clientEnv(env: Record<string, string>) {
  const supabaseUrl = (env.VITE_SUPABASE_URL || env.SUPABASE_URL || '').replace(/\/$/, '');
  return {
    VITE_DISCORD_CLIENT_ID: env.VITE_DISCORD_CLIENT_ID || env.DISCORD_CLIENT_ID || '',
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '',
    VITE_API_BASE_URL: env.VITE_API_BASE_URL || '',
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  const client = clientEnv(env);

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_DISCORD_CLIENT_ID': JSON.stringify(client.VITE_DISCORD_CLIENT_ID),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(client.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(client.VITE_SUPABASE_ANON_KEY),
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(client.VITE_API_BASE_URL),
    },
    server: {
      port: 5180,
      strictPort: true,
    },
  };
});
