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
export const test = base.extend<{ demoReset: void; affiliateDemo: boolean }>({
  affiliateDemo: [false, { option: true }],
  demoReset: [
    async ({ context, affiliateDemo }, use, info) => {
      const affiliate =
        affiliateDemo ||
        info.annotations.some((a) => a.type === 'demo' && a.description === 'affiliate');
      if (env.E2E_TARGET === 'server') {
        run(['--filter', '@opchub/db', 'seed:demo', ...(affiliate ? ['--affiliate'] : [])]);
        run(['--filter', '@opchub/server', 'flush:dev-cache']);
      } else if (affiliate) {
        await context.addCookies([
          {
            name: 'opchub-mock-affiliate-demo',
            value: '1',
            url: `http://localhost:${env.PORTAL_PORT}`,
          },
        ]);
      }
      await use();
    },
    { auto: true },
  ],
});
