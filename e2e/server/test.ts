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
export const test = base.extend<{ demoReset: void }>({
  demoReset: [
    // eslint-disable-next-line no-empty-pattern -- fixture tự động không dùng fixture khác
    async ({}, use) => {
      if (env.E2E_TARGET === 'server') {
        run(['--filter', '@opchub/db', 'seed:demo']);
        run(['--filter', '@opchub/server', 'flush:dev-cache']);
      }
      await use();
    },
    { auto: true },
  ],
});
