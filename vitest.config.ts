import path from 'node:path';
import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@edge': path.resolve(__dirname, 'supabase/functions/_shared'),
    },
  },
});
