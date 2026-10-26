import { randomUUID } from 'node:crypto';
import { createPrismaClient, Prisma, type DbClient } from '@opchub/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { paidMembersQuery } from '@/modules/membership-fee/repositories/paid-members.query';
import { loadEnv } from '@/common/config';

describe('EXPLAIN backfill keyset (TIP-V2-401)', () => {
  let db: DbClient;
  beforeAll(() => {
    db = createPrismaClient(loadEnv().DATABASE_URL, { max: 2 });
  });
  afterAll(async () => {
    await db.$disconnect();
  });

  it('REQ-301 EXPLAIN ANALYZE BUFFERS trên 10000 kỳ phí, chỉ đọc trang 500 qua index', async () => {
    const prefix = `plan-${randomUUID()}-`;
    const rollback = new Error('rollback EXPLAIN fixture');
    await expect(
      db.$transaction(
        async (tx) => {
          await tx.$executeRaw`
        INSERT INTO users (id, member_code, account_type, full_name, email, updated_at)
        SELECT ${prefix} || lpad(n::text, 5, '0'), ${prefix} || n::text,
          'personal', 'Plan test', ${prefix} || n::text || '@test.opchub.vn', now()
        FROM generate_series(1, 10000) AS n`;
          await tx.$executeRaw`
        INSERT INTO membership_fees (user_id, status, valid_until, amount, updated_at)
        SELECT id, 'active', '2027-10-20'::timestamptz, 1200000, now()
        FROM users WHERE id LIKE ${prefix + '%'}`;
          await tx.$executeRaw`
        INSERT INTO membership_fee_periods (id, user_id, starts_at, ends_at, amount, source)
        SELECT 'period-' || id, id, '2026-10-20'::timestamptz, '2027-10-20'::timestamptz,
          600000, 'transfer' FROM users WHERE id LIKE ${prefix + '%'}`;
          await tx.$executeRaw`ANALYZE users`;
          await tx.$executeRaw`ANALYZE membership_fees`;
          await tx.$executeRaw`ANALYZE membership_fee_periods`;
          const rows = await tx.$queryRaw<{ 'QUERY PLAN': string }[]>(Prisma.sql`
        EXPLAIN (ANALYZE, BUFFERS) ${paidMembersQuery(prefix + '05000', 500)}`);
          const plan = rows.map((r) => r['QUERY PLAN']).join('\n');
          process.stdout.write(
            `\nTIP-V2-401 backfill EXPLAIN (10000 rows, cursor 5000):\n${plan}\n`,
          );
          expect(plan).toMatch(/Index (Only )?Scan/);
          expect(plan).toMatch(/Index Cond:.*user_id >/);
          expect(plan).not.toMatch(/Seq Scan on (users|membership_fees|membership_fee_periods)/);
          const page = await tx.$queryRaw<{ userId: string }[]>(
            paidMembersQuery(prefix + '05000', 500),
          );
          expect(page).toHaveLength(500);
          expect(page[0]?.userId).toBe(prefix + '05001');
          expect(page.at(-1)?.userId).toBe(prefix + '05500');
          throw rollback;
        },
        { timeout: 60_000 },
      ),
    ).rejects.toBe(rollback);
    expect(await db.user.count({ where: { id: { startsWith: prefix } } })).toBe(0);
  });
});
