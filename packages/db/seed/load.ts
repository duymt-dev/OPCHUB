import { argon2id, hash } from 'argon2';
import { z } from 'zod';
import { createPrismaClient } from '../src/client';
import { assertDemoDatabase } from './demo/guard';

/**
 * `pnpm --filter @opchub/db seed:load` — thành viên tải cho k6 chat (TIP-B66): LOAD_USERS TK
 * `load-<n>@load.opchub.test` (một mật khẩu chung LOAD_PASSWORD, chỉ dùng trên DB dev/test), đã
 * đóng phí, là thành viên nhóm LOAD_GROUP. Idempotent: xoá TK tải cũ rồi tạo lại.
 * Chỉ chạy trên opchub_dev / opchub_test như seed:demo.
 */
const env = z
  .object({
    DIRECT_URL: z.string().url(),
    LOAD_USERS: z.coerce.number().int().min(1).max(20_000).default(500),
    LOAD_GROUP: z.string().min(1).default('c1'),
    LOAD_PASSWORD: z.string().min(8),
  })
  // eslint-disable-next-line no-restricted-syntax -- script CLI, env parse bằng zod tại chỗ
  .parse(process.env);

let dbName: string;
try {
  dbName = assertDemoDatabase(env.DIRECT_URL);
} catch (e) {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
}

const YEAR_MS = 365 * 86_400_000;
const db = createPrismaClient(env.DIRECT_URL, { max: 2 });
const started = Date.now();
try {
  const passwordHash = await hash(env.LOAD_PASSWORD, { type: argon2id });
  const now = new Date();
  const ids = Array.from({ length: env.LOAD_USERS }, (_, i) => `load-${i + 1}`);
  await db.$transaction(
    async (tx) => {
      await tx.user.deleteMany({ where: { id: { startsWith: 'load-' } } });
      await tx.user.createMany({
        data: ids.map((id, i) => ({
          id,
          memberCode: `LD${String(i + 1).padStart(6, '0')}`,
          accountType: 'personal' as const,
          fullName: `Tải thử ${i + 1}`,
          email: `${id}@load.opchub.test`,
          passwordHash,
          systemRole: 'member' as const,
          status: 'active' as const,
          emailVerifiedAt: now,
        })),
      });
      await tx.membershipFee.createMany({
        data: ids.map((userId) => ({
          userId,
          status: 'active' as const,
          validUntil: new Date(now.getTime() + YEAR_MS),
          paidAt: now,
          amount: 600_000,
        })),
      });
      await tx.groupMember.createMany({
        data: ids.map((userId) => ({
          groupId: env.LOAD_GROUP,
          userId,
          groupRole: 'member' as const,
          status: 'member' as const,
        })),
      });
    },
    { timeout: 120_000 },
  );
  process.stdout.write(
    `Seed tải: ${ids.length} TK trong ${env.LOAD_GROUP} trên ${dbName} (${Date.now() - started} ms)\n`,
  );
} finally {
  await db.$disconnect();
}
