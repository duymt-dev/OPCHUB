import { argon2id, hash } from 'argon2';
import { z } from 'zod';
import { planAmount } from '@opchub/shared';
import { createPrismaClient } from '../src/client';
import { assertDemoDatabase } from './demo/guard';

/**
 * `pnpm --filter @opchub/db seed:load` — thành viên tải cho k6 chat (TIP-B66): LOAD_USERS TK
 * `load-<n>@load.opchub.test` (một mật khẩu chung LOAD_PASSWORD, chỉ dùng trên DB dev/test), đã
 * đóng phí; TK thứ i vào nhóm LOAD_GROUPS[(i-1) % n] (chia đều nhiều phòng như thực tế, Q-B66-2). Idempotent: xoá TK tải cũ rồi tạo lại.
 * Chỉ chạy trên opchub_dev / opchub_test như seed:demo.
 */
const env = z
  .object({
    DIRECT_URL: z.string().url(),
    LOAD_USERS: z.coerce.number().int().min(1).max(20_000).default(500),
    LOAD_GROUPS: z
      .string()
      .default('c1')
      .transform((v) => v.split(',').filter(Boolean)),
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
          // Mã TV thật (đối soát CK chỉ nhận `TV` + 6 số), dải 8xxxxx tách khỏi sequence + TK demo (9xxxxx) (TV000001…)
          memberCode: `TV${800_000 + i + 1}`,
          accountType: 'personal' as const,
          fullName: `Tải thử ${i + 1}`,
          email: `${id}@load.opchub.test`,
          passwordHash,
          systemRole: 'member' as const,
          status: 'active' as const,
          emailVerifiedAt: now,
          declaredAt: now,
        })),
      });
      await tx.membershipFee.createMany({
        data: ids.map((userId) => ({
          userId,
          status: 'active' as const,
          validUntil: new Date(now.getTime() + YEAR_MS),
          paidAt: now,
          plan: 'personal' as const,
          amount: planAmount('personal'),
        })),
      });
      await tx.groupMember.createMany({
        data: ids.map((userId, i) => ({
          groupId: env.LOAD_GROUPS[i % env.LOAD_GROUPS.length] ?? 'c1',
          userId,
          groupRole: 'member' as const,
          status: 'member' as const,
        })),
      });
    },
    { timeout: 120_000 },
  );
  process.stdout.write(
    `Seed tải: ${ids.length} TK trong ${env.LOAD_GROUPS.join(',')} trên ${dbName} (${Date.now() - started} ms)\n`,
  );
} finally {
  await db.$disconnect();
}
