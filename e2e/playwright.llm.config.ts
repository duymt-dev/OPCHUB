import native from './playwright.server.config';
import { defineConfig } from '@playwright/test';
import { env } from './env';

if (env.SKIP_SEED !== '1') {
  throw new Error('Live AI requires SKIP_SEED=1; never reset a database implicitly');
}

/** Explicit opt-in only; ordinary behavior projects do not discover this directory. */
export default defineConfig({
  ...native,
  globalSetup: './llm/global-setup.ts',
  globalTeardown: [],
  timeout: 420000,
  workers: 1,
  maxFailures: 0,
  retries: 0,
  webServer: [],
  use: { ...native.use, trace: 'off', video: 'off', screenshot: 'off' },
  projects: [
    { name: 'provider-matrix', testDir: './llm', testMatch: /provider-matrix\.spec\.ts/ },
    { name: 'real-provider', testDir: './llm', testMatch: /native-real-provider\.spec\.ts/ },
  ],
});
