import { z } from 'zod';
import { createPrismaClient } from '../src/client';
import { seedRequired } from './required';

/** `pnpm --filter @opchub/db seed` — seed bắt buộc (idempotent). Seed demo ở TIP-B62. */
const env = z
  .object({
    DIRECT_URL: z.string().url(),
    SEED_SUPER_ADMIN_PASSWORD: z.string().min(10, 'SEED_SUPER_ADMIN_PASSWORD ≥ 10 ký tự'),
  })
  // eslint-disable-next-line no-restricted-syntax -- script CLI, env parse bằng zod tại chỗ
  .parse(process.env);

const db = createPrismaClient(env.DIRECT_URL, { max: 2 });
try {
  await seedRequired(db, env.SEED_SUPER_ADMIN_PASSWORD);
  process.stdout.write('Seed bắt buộc xong\n');
} finally {
  await db.$disconnect();
}
