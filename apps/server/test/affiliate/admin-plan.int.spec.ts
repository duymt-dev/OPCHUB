import { randomUUID } from 'node:crypto';
import { createPrismaClient, Prisma, type DbClient } from '@opchub/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadEnv } from '@/common/config';
import { affiliatePageQuery } from '@/modules/affiliate/repositories/affiliate-admin.query';
import { commissionPageQuery } from '@/modules/affiliate/repositories/commission-admin.query';

describe('Affiliate Admin EXPLAIN (TIP-V2-402)', () => {
  let db: DbClient;
  beforeAll(async () => {
    // Session-local clones use the actual deployed columns/checks/defaults/indexes.
    // Isolate plan measurement from dead pages left by unrelated rollback fixtures.
    db = createPrismaClient(loadEnv().DATABASE_URL, { max: 1 });
    await db.$executeRaw`CREATE TEMP TABLE affiliates (LIKE public.affiliates INCLUDING ALL)`;
    await db.$executeRaw`CREATE TEMP TABLE commissions (LIKE public.commissions INCLUDING ALL)`;
  });
  afterAll(async () => {
    await db.$disconnect();
  });

  it('10000 đại lý/commissions: trang sâu deferred join và export keyset dùng index', async () => {
    const prefix = `afplan-${randomUUID()}-`;
    try {
      await db.$transaction(
        async (tx) => {
          await tx.$executeRaw`
        INSERT INTO affiliates (id,user_id,code,rate,updated_at,created_at)
        SELECT ${prefix} || n::text,${prefix} || n::text,'Z' || upper(substr(md5(${prefix}),1,5)) || lpad(n::text,5,'0'),
          20,now(),'2026-09-01'::timestamptz + n * interval '1 second' FROM generate_series(1,10000) n`;
          await tx.$executeRaw`
        INSERT INTO commissions (id,affiliate_id,referred_user_id,fee_period_id,list_amount,amount,rate,month_key,plan,created_at)
        SELECT ${prefix} || n::text,${prefix} || n::text,${prefix} || (n+10000)::text,
          ${prefix} || n::text,600000,120000,20,'2026-09','personal',
          '2026-09-01'::timestamptz + n * interval '1 second' FROM generate_series(1,10000) n`;
        },
        { timeout: 60000 },
      );
      // Committed seed + normal maintenance: realistic visibility map/index-only scan.
      // Never disable seqscan or alter planner costs to force a plan.
      await db.$executeRaw`VACUUM (ANALYZE) affiliates`;
      await db.$executeRaw`VACUUM (ANALYZE) commissions`;
      const cursor = { date: new Date('2026-09-01T01:23:20Z'), id: prefix + '5000' };
      const queries = [
        ['affiliates offset5000', affiliatePageQuery({ page: 251, size: 20 }, [])],
        ['affiliates keyset', affiliatePageQuery({ page: 1, size: 20 }, [], undefined, cursor)],
        [
          'commissions all offset5000',
          commissionPageQuery({ page: 251, size: 20, status: 'all' }, []),
        ],
        [
          'commissions recorded offset5000',
          commissionPageQuery({ page: 251, size: 20, status: 'recorded' }, []),
        ],
        [
          'commissions keyset',
          commissionPageQuery({ page: 1, size: 20, status: 'all' }, [], { after: cursor }),
        ],
      ] as const;
      for (const [label, query] of queries) {
        const result = await db.$queryRaw<{ 'QUERY PLAN': string }[]>(
          Prisma.sql`EXPLAIN (ANALYZE, BUFFERS) ${query}`,
        );
        const plan = result.map((r) => r['QUERY PLAN']).join('\n');
        process.stdout.write(
          `\nTIP-V2-402 ${label} (10000 rows, deployed-schema temp clones):\n${plan}\n`,
        );
        expect(plan).toMatch(/Index (Only )?Scan/);
        expect(plan).not.toMatch(/Seq Scan on (affiliates|commissions)/);
        const rows = await db.$queryRaw<{ id: string }[]>(query);
        expect(rows).toHaveLength(20);
      }
    } finally {
      await db.$executeRaw`DROP TABLE IF EXISTS pg_temp.commissions`;
      await db.$executeRaw`DROP TABLE IF EXISTS pg_temp.affiliates`;
    }
  });
});
