import { defineConfig } from '@playwright/test';
import { env } from '../env';
import { ADMIN_URL } from '../urls';

/** Font-only browser proof. No server/test fixtures, globalSetup, seeds or database connection. */
const native = env.E2E_TARGET === 'server';
export default defineConfig({
  testDir: '.',
  testMatch: 'admin-i18n-fonts.spec.ts',
  timeout: 60_000,
  workers: 2,
  fullyParallel: true,
  reporter: [['list']],
  use: { browserName: 'chromium', deviceScaleFactor: 1, timezoneId: 'Asia/Ho_Chi_Minh' },
  webServer: {
    command: `pnpm --filter @opchub/admin exec next start -p ${native ? env.SERVER_ADMIN_PORT : env.ADMIN_PORT}`,
    url: `${ADMIN_URL}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_DIST_DIR: native ? '.next-server-tip824' : '.next-msw-tip824',
      NEXT_PUBLIC_API_MOCKING: native ? 'off' : 'msw',
    },
  },
});
