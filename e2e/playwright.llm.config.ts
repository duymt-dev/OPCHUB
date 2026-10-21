import native from './playwright.server.config';
import { defineConfig } from '@playwright/test';

/** Explicit opt-in only; ordinary behavior projects do not discover this directory. */
export default defineConfig({
  ...native,
  globalSetup: './llm/global-setup.ts',
  timeout: 420000,
  workers: 1,
  maxFailures: 1,
  retries: 0,
  webServer: [],
  projects: [
    { name: 'real-provider', testDir: './llm', testMatch: /native-real-provider\.spec\.ts/ },
  ],
});
