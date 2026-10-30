import { test as base } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { env } from '../env';

export { expect } from '@playwright/test';
export type { Locator, Page } from '@playwright/test';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

function run(args: string[]): void {
  const r = spawnSync('pnpm', args, {
    cwd: ROOT,
    stdio: 'pipe',
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) throw new Error(`pnpm ${args.join(' ')} thất bại`);
}

/**
 * Cách ly dữ liệu giữa các test như bản MSW: MSW dựng lại CSDL giả cho mỗi trang mới, nên mỗi
 * test bắt đầu từ dữ liệu prototype. Trên server thật (E2E_TARGET=server, TIP-B62) fixture tự động
 * này reset `seed:demo` (opchub_dev) + xoá cache Redis dev trước MỖI test. Bản MSW: không làm gì.
 * Không đổi assertion nào của test — chỉ thay nguồn import `test`.
 */
export const test = base.extend<{
  demoReset: void;
  affiliateDemo: boolean;
  affiliatePaused: boolean;
  affiliatePayout: boolean;
  botManual: boolean;
  projectDemo: boolean;
  revenueDemo: boolean;
}>({
  affiliateDemo: [false, { option: true }],
  affiliatePaused: [false, { option: true }],
  affiliatePayout: [false, { option: true }],
  botManual: [false, { option: true }],
  projectDemo: [false, { option: true }],
  revenueDemo: [false, { option: true }],
  demoReset: [
    async (
      {
        context,
        affiliateDemo,
        affiliatePaused,
        affiliatePayout,
        botManual,
        projectDemo,
        revenueDemo,
      },
      use,
      info,
    ) => {
      const affiliate =
        affiliateDemo ||
        affiliatePaused ||
        affiliatePayout ||
        info.annotations.some((a) => a.type === 'demo' && a.description === 'affiliate');
      // P-01-BOTCARD: persisted demo bot history (MSW seeds the same history by default)
      const botHistory = info.annotations.some(
        (a) => a.type === 'demo' && a.description === 'bot-history',
      );
      // SKIP_SEED=1: chạy lại một phần trên dữ liệu đang có, không reset (README §3)
      if (env.E2E_TARGET === 'server' && env.SKIP_SEED !== '1') {
        run([
          '--filter',
          '@opchub/db',
          'seed:demo',
          ...(affiliate ? ['--affiliate'] : []),
          ...(affiliatePaused ? ['--affiliate-paused'] : []),
          ...(affiliatePayout ? ['--affiliate-payout'] : []),
          ...(revenueDemo ? ['--revenue'] : []),
          ...(botManual || botHistory ? ['--bot-manual'] : []),
          ...(botHistory ? ['--bot-history'] : []),
          ...(projectDemo ||
          info.annotations.some((a) => a.type === 'demo' && a.description === 'projects')
            ? ['--projects']
            : []),
        ]);
        run(['--filter', '@opchub/server', 'flush:dev-cache']);
      } else if (affiliate) {
        await context.addCookies([
          {
            name: 'opchub-mock-affiliate-demo',
            value: '1',
            url: `http://localhost:${env.PORTAL_PORT}`,
          },
        ]);
        if (affiliatePayout)
          await context.addCookies([
            {
              name: 'opchub-mock-affiliate-payout',
              value: '1',
              url: `http://localhost:${env.PORTAL_PORT}`,
            },
          ]);
        if (affiliatePaused)
          await context.addCookies([
            {
              name: 'opchub-mock-affiliate-paused',
              value: '1',
              url: `http://localhost:${env.PORTAL_PORT}`,
            },
          ]);
      }
      if (env.E2E_TARGET === 'msw' && botManual)
        await context.addCookies([
          { name: 'opchub-mock-bot-manual', value: '1', url: `http://localhost:${env.ADMIN_PORT}` },
        ]);
      if (env.E2E_TARGET === 'msw' && revenueDemo)
        await context.addCookies([
          {
            name: 'opchub-mock-revenue-demo',
            value: '1',
            url: `http://localhost:${env.ADMIN_PORT}`,
          },
        ]);
      await use();
    },
    { auto: true },
  ],
});
