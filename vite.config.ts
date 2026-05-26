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
    VITE_DISCORD_REDIRECT_URI:
      env.VITE_DISCORD_REDIRECT_URI || env.DISCORD_REDIRECT_URI || '',
    VITE_APP_ORIGIN: env.VITE_APP_ORIGIN || env.APP_ORIGIN || '',
    VITE_BOT_INSTALL_REDIRECT_URI:
      env.VITE_BOT_INSTALL_REDIRECT_URI || env.BOT_INSTALL_REDIRECT_URI || '',
  };
}

function vendorChunk(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined;
  if (id.includes('@supabase')) return 'supabase';
  if (id.includes('@discord')) return 'discord';
  if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/')) {
    return 'react-vendor';
  }
  if (id.includes('date-fns')) return 'date-fns';
  if (id.includes('lucide-react')) return 'icons';
  return undefined;
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
      'import.meta.env.VITE_DISCORD_REDIRECT_URI': JSON.stringify(
        client.VITE_DISCORD_REDIRECT_URI,
      ),
      'import.meta.env.VITE_APP_ORIGIN': JSON.stringify(client.VITE_APP_ORIGIN),
      'import.meta.env.VITE_BOT_INSTALL_REDIRECT_URI': JSON.stringify(
        client.VITE_BOT_INSTALL_REDIRECT_URI,
      ),
    },
    build: {
      target: 'es2022',
      sourcemap: false,
      reportCompressedSize: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('fh6cars.json')) return 'car-catalog';
            return vendorChunk(id);
          },
        },
      },
    },
    server: {
      port: 5180,
      strictPort: true,
      proxy: client.VITE_SUPABASE_URL
        ? {
            '/supabase': {
              target: client.VITE_SUPABASE_URL,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/supabase/, ''),
            },
          }
        : undefined,
    },
  };
});
