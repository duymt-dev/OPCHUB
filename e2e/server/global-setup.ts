import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { env } from '../env';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const API = env.API_PROXY_URL;

/**
 * Trước lượt e2e server thật (TIP-B62): kiểm API sống rồi reset dữ liệu demo bằng
 * `pnpm --filter @opchub/db seed:demo` (idempotent, chỉ chạy được trên opchub_dev / opchub_test —
 * script tự chặn DB khác) rồi xoá cache Redis dev (db 1). Bỏ reset: SKIP_SEED=1.
 */
export default async function globalSetup(): Promise<void> {
  const health = await fetch(`${API}/v1/health`).catch(() => null);
  if (!health?.ok) {
    throw new Error(
      `API ${API} chưa chạy — khởi động server (xem e2e/server/README.md) trước khi chạy e2e:server`,
    );
  }
  if (env.SKIP_SEED === '1') return;
  const r = spawnSync('pnpm', ['--filter', '@opchub/db', 'seed:demo'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) throw new Error('seed:demo thất bại');
  // Cache Redis dev (unread chat, cài đặt, tổng quan) phải dựng lại từ dữ liệu vừa reset
  const f = spawnSync('pnpm', ['--filter', '@opchub/server', 'flush:dev-cache'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (f.status !== 0) throw new Error('flush:dev-cache thất bại');
}
