import { defineConfig } from '@playwright/test';
import server from './playwright.server.config';

/** Native-only lifecycle checks use real fee fixtures, never MSW response interception. */
export default defineConfig({
  ...server,
  projects: [
    { name: 'project-lifecycle', testDir: './audit', testMatch: /project-expiry\.audit\.ts/ },
  ],
});
