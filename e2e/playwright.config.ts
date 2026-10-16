import { defineConfig } from '@playwright/test';

/** Cho context.route chặn được cả request đi qua service worker (MSW) */
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';

export const PROTO_URL = 'http://localhost:4800';
export const PORTAL_URL = 'http://localhost:3000';
export const ADMIN_URL = 'http://localhost:3001';

/**
 * parity: so ảnh prototype (docs/spec) với app mới — coding-packs/standards/frontend/ui-parity.md
 * behavior: test hành vi trên app mới
 * App phải được build trước (`pnpm build`); webServer chạy bản production cho ổn định.
 */
export default defineConfig({
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  globalTeardown: './parity/report.ts',
  use: { locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh', deviceScaleFactor: 1 },
  projects: [
    { name: 'parity', testDir: './parity', testMatch: /.*\.spec\.ts/ },
    { name: 'behavior', testDir: './behavior', testMatch: /.*\.spec\.ts/ },
  ],
  webServer: [
    { command: 'pnpm proto', url: `${PROTO_URL}/index.html`, reuseExistingServer: true },
    {
      command: 'pnpm --filter @opchub/portal start',
      url: `${PORTAL_URL}/login`,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @opchub/admin start',
      url: `${ADMIN_URL}/login`,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
