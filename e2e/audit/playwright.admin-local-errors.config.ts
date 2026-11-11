import { defineConfig } from '@playwright/test';
import fontAudit from './playwright.admin-fonts.config';

/** Local validation must not submit a mutation. No server fixture, seed or database setup. */
export default defineConfig({
  ...fontAudit,
  testMatch: 'admin-local-errors.spec.ts',
  fullyParallel: false,
  workers: 1,
});
