import { defineConfig } from '@playwright/test';
import { cpus } from 'node:os';
import { env } from './env';
import { ADMIN_URL, PORTAL_URL, PROTO_URL } from './urls';

/** Cho context.route chặn được cả request đi qua service worker (MSW) */
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';

export { ADMIN_URL, PORTAL_URL, PROTO_URL };

const WORKERS = env.PARITY_WORKERS ?? Math.max(1, Math.min(6, cpus().length - 1));

/**
 * parity: so ảnh prototype (docs/spec) với app mới — coding-packs/standards/frontend/ui-parity.md
 *   PARITY_IDS='A-*,D-01'  chọn màn (glob)
 *   PARITY_MODE=proto-only chỉ chạy chuỗi thao tác trên prototype, chụp ảnh gốc
 * behavior: test hành vi trên app mới
 * App phải được build trước (`pnpm build`); webServer chạy bản production cho ổn định.
 */
export default defineConfig({
  timeout: 120_000,
  fullyParallel: true,
  workers: WORKERS,
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
