import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: fileURLToPath(new URL('./node_modules/.vite-vitest', import.meta.url)),
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, css: false, pool: 'forks', maxWorkers: '50%' },
});
