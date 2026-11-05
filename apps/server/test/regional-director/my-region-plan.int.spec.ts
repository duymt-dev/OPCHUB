import { createPrismaClient, Prisma, type DbClient } from '@opchub/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadEnv } from '@/common/config';
import { myRegionQueries } from '@/modules/reporting/regional/my-region.queries';
import { referralRowsPage } from '@/modules/affiliate/repositories/referral-rows.query';
import { seedAffiliateHistoryPlan } from '../factories/affiliate-plan.factory';

describe('TIP-V46-804 deployed index plans', () => {
  let db: DbClient;
  beforeAll(async () => {
    db = createPrismaClient(loadEnv().DATABASE_URL, { max: 1 });
    await seedAffiliateHistoryPlan(db);
    await db.$executeRaw`CREATE TEMP TABLE regional_shares (LIKE public.regional_shares INCLUDING ALL)`;
    await db.$executeRaw`CREATE TEMP TABLE regional_payouts (LIKE public.regional_payouts INCLUDING ALL)`;
    await db.$executeRaw`INSERT INTO regional_shares
      (id,source,source_id,customer_id,affiliate_id,affiliate_user_id,region,director_user_id,
       plan,base_amount,customer_year,percent,director_amount,media_soft_amount,month_key,recorded_at,status)
      SELECT 's'||n::text,'membership','p'||n::text,'u'||n::text,'a'||(1+(n-1)%100)::text,
        'u'||(1+(n-1)%100)::text,'north',CASE WHEN n%100=0 THEN 'u1' ELSE 'u2' END,
        'personal',1200000,1+(n%5),50,600000,600000,'2026-10',now(),'pending'
      FROM generate_series(1,10000) n`;
    await db.$executeRaw`VACUUM (ANALYZE) regional_shares`;
    await db.$executeRaw`ANALYZE regional_payouts`;
  });
  afterAll(async () => {
    await db.$disconnect();
  });
  it('4 regional aggregates and deferred commission/referral page seek on >=10000 rows', async () => {
    const queries = {
      ...myRegionQueries('north', 'u1'),
      referrals: referralRowsPage('a1', { page: 2, size: 20, month: '2026-09' }),
    };
    for (const [label, query] of Object.entries(queries)) {
      const plan = (
        await db.$queryRaw<{ 'QUERY PLAN': string }[]>(
          Prisma.sql`EXPLAIN (ANALYZE, BUFFERS) ${query}`,
        )
      )
        .map((r) => r['QUERY PLAN'])
        .join('\n');
      process.stdout.write(
        `\nTIP-V46-804 ${label} actual deployed-schema clones, 10000 shares:\n${plan}\n`,
      );
      expect(plan, label).not.toMatch(
        /Seq Scan on (regional_shares|commissions|referrals|users|affiliates)\b/,
      );
      expect(plan, label).toMatch(/Index (Only )?Scan|Bitmap Index Scan/);
    }
  });
});
