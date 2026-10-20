import { z } from 'zod';
import { createPrismaClient } from '../src/client';
import { seedDemo } from './demo/index';
import { assertDemoDatabase } from './demo/guard';

/**
 * `pnpm --filter @opchub/db seed:demo` — dữ liệu demo giống MSW cho e2e trên server thật (TIP-B62).
 * Idempotent: xoá dữ liệu nghiệp vụ rồi nạp lại trong một transaction. Chỉ chạy trên
 * opchub_dev / opchub_test (kiểm tên DB trong DIRECT_URL trước khi kết nối).
 */
const env = z
  .object({ DIRECT_URL: z.string().url() })
  // eslint-disable-next-line no-restricted-syntax -- script CLI, env parse bằng zod tại chỗ
  .parse(process.env);

let dbName: string;
try {
  dbName = assertDemoDatabase(env.DIRECT_URL);
} catch (e) {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
}

const db = createPrismaClient(env.DIRECT_URL, { max: 2 });
const started = Date.now();
try {
  await seedDemo(db, { affiliate: process.argv.includes('--affiliate') });
  process.stdout.write(`Seed demo xong trên ${dbName} (${Date.now() - started} ms)\n`);
} finally {
  await db.$disconnect();
}
