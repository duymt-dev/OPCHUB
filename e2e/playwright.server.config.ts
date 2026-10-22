import './server/target';
import { defineConfig } from '@playwright/test';
import { cpus } from 'node:os';
import { env } from './env';
import { PROTO_URL } from './urls';

/**
 * e2e trên SERVER THẬT (TIP-B62/B63): Portal/Admin build với `NEXT_PUBLIC_API_MOCKING=off`
 * vào `.next-server` (không đè bản MSW của parity), Next chuyển `/v1/*` sang API thật.
 * Chuẩn bị (e2e/server/README.md): server api + socket + worker đang chạy trên `opchub_dev`
 * đã `seed:demo`. `globalSetup` reset dữ liệu demo trước mỗi lượt chạy.
 *   SERVER_PORTAL_PORT / SERVER_ADMIN_PORT  cổng app chế độ server (mặc định 3200 / 3201)
 */
const PORTAL_PORT = env.SERVER_PORTAL_PORT;
const ADMIN_PORT = env.SERVER_ADMIN_PORT;
const API_URL = env.API_PROXY_URL;
const SOCKET_URL = env.SOCKET_PUBLIC_URL;

/** Biến build/run của Next chế độ server (build trước bằng `pnpm e2e:server:build`) */
export const SERVER_NEXT_ENV = {
  NEXT_DIST_DIR: '.next-server',
  NEXT_PUBLIC_API_MOCKING: 'off',
  API_PROXY_URL: API_URL,
  NEXT_PUBLIC_SOCKET_URL: SOCKET_URL,
};
const start = (app: 'portal' | 'admin', port: number) =>
  `pnpm --filter @opchub/${app} exec next start -p ${port}`;

export default defineConfig({
  timeout: 120_000,
  fullyParallel: false,
  // Dữ liệu dùng chung một DB → chạy tuần tự để test không giẫm trạng thái nhau
  workers: env.SERVER_WORKERS,
  reporter: [['list']],
  globalSetup: './server/global-setup.ts',
  globalTeardown: './parity/report.ts',
  use: { locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh', deviceScaleFactor: 1 },
  projects: [
    { name: 'parity', testDir: './parity', testMatch: /.*\.spec\.ts/ },
    { name: 'behavior', testDir: './behavior', testMatch: /.*\.spec\.ts/ },
  ],
  webServer: [
    {
      // D-65 (TIP-V2-118): stub DLPL API — API dev chạy TAX_LOOKUP_PROVIDER=dlpl trỏ về đây
      command: `node --experimental-strip-types server/dlpl-stub.ts ${env.DLPL_STUB_PORT}`,
      url: `http://127.0.0.1:${env.DLPL_STUB_PORT}/__stub/health`,
      reuseExistingServer: true,
    },
    {
      command: `pnpm exec serve ../docs/spec -l ${env.PROTO_PORT} --no-clipboard`,
      url: `${PROTO_URL}/index.html`,
      reuseExistingServer: true,
    },
    {
      command: start('portal', PORTAL_PORT),
      env: SERVER_NEXT_ENV,
      url: `http://localhost:${PORTAL_PORT}/login`,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: start('admin', ADMIN_PORT),
      env: SERVER_NEXT_ENV,
      url: `http://localhost:${ADMIN_PORT}/login`,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
  metadata: { cpus: cpus().length },
});
