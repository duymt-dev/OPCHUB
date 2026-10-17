// Áp migration vào DB test (TEST_DATABASE_URL) — dùng trước integration test
import { spawnSync } from 'node:child_process';

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  process.stderr.write('Thiếu TEST_DATABASE_URL\n');
  process.exit(1);
}
const r = spawnSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, DIRECT_URL: url },
});
process.exit(r.status ?? 1);
