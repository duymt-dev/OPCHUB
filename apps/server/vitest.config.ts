import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const alias = { '@': fileURLToPath(new URL('./src', import.meta.url)) };

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: { name: 'unit', include: ['src/**/*.spec.ts', 'test/audit/**/*.spec.ts'] },
      },
      {
        resolve: { alias },
        test: {
          name: 'int',
          globalSetup: ['test/setup/revenue-outbox.teardown.ts'],
          include: ['test/**/*.int.spec.ts'],
          setupFiles: ['test/setup/env.ts'],
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
