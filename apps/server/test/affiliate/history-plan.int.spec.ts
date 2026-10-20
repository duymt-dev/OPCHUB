import { createPrismaClient, Prisma, type DbClient } from '@opchub/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadEnv } from '@/common/config';
import { memberSearchQuery } from '@/modules/account/repositories/member-search.query';
import { affiliatePageQuery } from '@/modules/affiliate/repositories/affiliate-admin.query';
import { commissionPageQuery } from '@/modules/affiliate/repositories/commission-admin.query';
import {
  affiliateCustomersQuery,
  affiliateMonthsQuery,
} from '@/modules/affiliate/repositories/affiliate-history.query';
import {
  payoutPageQuery,
  referralPageQuery,
} from '@/modules/affiliate/repositories/me-affiliate.query';
import { seedAffiliateHistoryPlan } from '../factories/affiliate-plan.factory';

describe('Affiliate history/search EXPLAIN (TIP-V2-402)', () => {
  let db: DbClient;
  beforeAll(async () => {
    db = createPrismaClient(loadEnv().DATABASE_URL, { max: 1 });
    await seedAffiliateHistoryPlan(db);
  });
  afterAll(async () => {
    await db.$disconnect();
  });

  it('REQ-311 history, Portal tháng và search trên 10000 commissions/affiliates, 20000 users/referrals', async () => {
    const q = { page: 2, size: 20 };
    const queries = [
      ['Admin customers', affiliateCustomersQuery('a1', q), 20],
      ['Admin months', affiliateMonthsQuery('a1', { page: 1, size: 20 }), 1],
      ['Portal referrals all', referralPageQuery('a1', q), 20],
      ['Portal referrals month', referralPageQuery('a1', { ...q, month: '2026-09' }), 20],
      ['Portal payouts', payoutPageQuery('a1', { page: 1, size: 20 }), 20],
      ['Account accent search', memberSearchQuery('Nguyen Tra My'), 1],
      [
        'Admin affiliate code search',
        affiliatePageQuery({ page: 1, size: 20, q: 'Z00001' }, []),
        1,
      ],
      [
        'Admin affiliate member search',
        affiliatePageQuery({ page: 1, size: 20, q: 'Nguyen Tra My' }, ['u1']),
        1,
      ],
      [
        'Admin commission code search',
        commissionPageQuery({ ...q, q: 'Z00001', status: 'all' }, []),
        20,
      ],
      [
        'Admin commission member search',
        commissionPageQuery({ ...q, q: 'Nguyen Tra My', status: 'all' }, ['u1']),
        20,
      ],
    ] as const;
    for (const [label, query, length] of queries) {
      const result = await db.$queryRaw<{ 'QUERY PLAN': string }[]>(
        Prisma.sql`EXPLAIN (ANALYZE, BUFFERS) ${query}`,
      );
      const plan = result.map((r) => r['QUERY PLAN']).join('\n');
      process.stdout.write(
        `\nTIP-V2-402 ${label} (deployed-schema temp clones, 10k/20k):\n${plan}\n`,
      );
      expect(plan, label).toMatch(/Index (Only )?Scan|Bitmap Index Scan/);
      expect(plan, label).not.toMatch(/Seq Scan on (users|affiliates|referrals|commissions)/);
      if (label.startsWith('Admin commission')) {
        expect(plan, label).toMatch(/Index Cond: \(affiliate_id =/);
      }
      expect(await db.$queryRaw(query), label).toHaveLength(length);
    }
  });
});
