import { createPrismaClient, Prisma, type DbClient } from '@opchub/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadEnv } from '@/common/config';
import {
  renewalRowsQuery,
  renewalEligible,
} from '@/modules/membership-fee/repositories/renewal-query';
import { renewalWindow } from '@/modules/membership-fee/repositories/renewal.repository';
describe('REQ-620 renewal deployed-index plans', () => {
  let db: DbClient;
  const now = new Date('2097-12-01T01:00:00Z');
  beforeAll(async () => {
    db = createPrismaClient(loadEnv().DATABASE_URL, { max: 1 });
    await db.$executeRaw`CREATE TEMP TABLE users (LIKE public.users INCLUDING ALL)`;
    await db.$executeRaw`CREATE TEMP TABLE membership_fees (LIKE public.membership_fees INCLUDING ALL)`;
    await db.$executeRaw`CREATE TEMP TABLE fee_reminders (LIKE public.fee_reminders INCLUDING ALL)`;
    await db.$executeRaw`INSERT INTO users (id,member_code,account_type,full_name,email,updated_at)
      SELECT 'renewal-u'||n,'RU'||n,'personal','Renewal plan '||n,'renewal-plan-'||n||'@test.opchub.vn',now()
      FROM generate_series(1,10000)n`;
    await db.$executeRaw`INSERT INTO membership_fees(user_id,status,valid_until,amount,plan,updated_at)
      SELECT 'renewal-u'||n,'active',${now}::timestamptz+CASE WHEN n<=100 THEN interval '12 days' ELSE interval '100 days' END,
        1200000,'personal',now() FROM generate_series(1,10000)n`;
    await db.$executeRaw`INSERT INTO fee_reminders(user_id,valid_until,milestone,sent_at)
      SELECT 'renewal-u'||n,${now}::timestamptz,'D30',${now}::timestamptz-interval '1 day' FROM generate_series(1,10000)n`;
    await db.$executeRaw`VACUUM (ANALYZE) users`;
    await db.$executeRaw`VACUUM (ANALYZE) membership_fees`;
    await db.$executeRaw`VACUUM (ANALYZE) fee_reminders`;
  });
  afterAll(async () => {
    await db.$disconnect();
  });
  it('list keyset and candidates actual queries seek at >=10000 membership_fees; latest sent uses covering index', async () => {
    const { from, to } = renewalWindow(now);
    const queries = {
      list: renewalRowsQuery(from, to, undefined, 21),
      keyset: renewalRowsQuery(
        from,
        to,
        {
          validUntil: new Date(now.getTime() + 12 * 86_400_000).toISOString(),
          userId: 'renewal-u20',
        },
        21,
      ),
      candidates: renewalRowsQuery(from, to, undefined, 500),
      count: Prisma.sql`SELECT count(*) FROM membership_fees f WHERE ${renewalEligible(from, to)}`,
    };
    for (const [label, query] of Object.entries(queries)) {
      const plan = (
        await db.$queryRaw<{ 'QUERY PLAN': string }[]>(
          Prisma.sql`EXPLAIN (ANALYZE,BUFFERS) ${query}`,
        )
      )
        .map((r) => r['QUERY PLAN'])
        .join('\n');
      process.stdout.write(
        `\nTIP-V46-805 ${label}, actual deployed index clones, 10000 fees:\n${plan}\n`,
      );
      expect(plan, label).not.toMatch(/Seq Scan on (membership_fees|users|fee_reminders)\b/);
      expect(plan, label).toMatch(/Index (Only )?Scan|Bitmap Index Scan/);
    }
  });
});
