import { defineConfig } from '@playwright/test';
import { env } from './env';
import { ADMIN_URL, PORTAL_URL } from './urls';

/** Serial presentation checks only. Never imports the global demo reset/seed fixture. */
const native = env.E2E_TARGET === 'server';
export default defineConfig({
  timeout: 60_000,
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: { browserName: 'chromium', timezoneId: 'Asia/Ho_Chi_Minh', deviceScaleFactor: 1 },
  projects: [
    {
      name: 'behavior',
      testDir: './behavior',
      testMatch: [
        'admin-i18n-screens.spec.ts',
        'admin-i18n-navigation.spec.ts',
        'admin-i18n-visual.spec.ts',
        'admin-i18n-sidebar.spec.ts',
        'admin-i18n-thai.spec.ts',
        'admin-i18n-lao.spec.ts',
        'admin-i18n-khmer.spec.ts',
        'admin-i18n-myanmar.spec.ts',
        'admin-i18n-picker.spec.ts',
        'admin-i18n-intl.spec.ts',
        'admin-i18n-all-locales.spec.ts',
        'admin-i18n-controls.spec.ts',
        'admin-i18n-auth.spec.ts',
        'admin-i18n-password.spec.ts',
        'admin-i18n-values.spec.ts',
        'admin-i18n-disabled.spec.ts',
        'admin-i18n-chat.spec.ts',
        'admin-i18n-values/protocol-contract.spec.ts',
        'admin-i18n-auth/totp-contract.spec.ts',
        'admin-i18n-auth/protocol-contract.spec.ts',
        'admin-i18n/response-lifetime.spec.ts',
      ],
    },
  ],
  webServer: [
    // MSW's cross-origin Affiliate relay backs every Admin API handler, including login.
    // This is a setup prerequisite only; all browser assertions remain identical in native.
    ...(native
      ? []
      : [
          {
            command: `pnpm --filter @opchub/portal exec next start -p ${env.PORTAL_PORT}`,
            url: `${PORTAL_URL}/login`,
            reuseExistingServer: false,
            timeout: 120_000,
            env: { NEXT_DIST_DIR: '.next-msw-tip824-portal', NEXT_PUBLIC_API_MOCKING: 'msw' },
          },
        ]),
    {
      command: `pnpm --filter @opchub/admin exec next start -p ${native ? env.SERVER_ADMIN_PORT : env.ADMIN_PORT}`,
      url: `${ADMIN_URL}/login`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        NEXT_DIST_DIR: native ? '.next-server-tip824' : '.next-msw-tip824',
        NEXT_PUBLIC_API_MOCKING: native ? 'off' : 'msw',
      },
    },
  ],
});
