import { createPrismaClient, Prisma, type DbClient } from '@opchub/db';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { loadEnv } from '@/common/config';
import {
  bankCountsQuery,
  bankTransactionsQuery,
} from '@/modules/membership-fee/repositories/bank-transactions.query';

let db: DbClient;
beforeAll(async () => {
  db = createPrismaClient(loadEnv().DATABASE_URL, { max: 1 });
  await db.$executeRaw`CREATE TEMP TABLE users (LIKE public.users INCLUDING ALL)`;
  await db.$executeRaw`CREATE TEMP TABLE payment_transactions (LIKE public.payment_transactions INCLUDING ALL)`;
  await db.$executeRaw`INSERT INTO users(id,member_code,account_type,full_name,email,updated_at)
    SELECT 'bank-u'||n,'TV'||lpad(n::text,6,'0'),'personal','Bank plan '||n,'bank-plan-'||n||'@test.opchub.vn',now()
    FROM generate_series(1,10000)n`;
  await db.$executeRaw`INSERT INTO payment_transactions(id,provider,bank_txn_id,amount,content,received_at,match_status,raw,matched_user_id)
    SELECT 'bank-plan-'||n,'plan',n::text,1200000,'OPCHUB TV'||lpad(n::text,6,'0'),
      '2099-01-01'::timestamptz+make_interval(secs=>n),
      (CASE n%5 WHEN 0 THEN 'ignored' WHEN 1 THEN 'matched' WHEN 2 THEN 'manual' WHEN 3 THEN 'short' ELSE 'unmatched' END)::payment_match_status,
      jsonb_build_object('payload',repeat('x',2000)),'bank-u'||n FROM generate_series(1,10000)n`;
  await db.$executeRaw`VACUUM (ANALYZE) users`;
  await db.$executeRaw`VACUUM (ANALYZE) payment_transactions`;
});
afterAll(async () => {
  await db.$disconnect();
});
it('REQ-621 actual list/keyset/counts SQL uses deployed covering index at10000 transactions, no Seq Scan', async () => {
  const queries = {
    list: bankTransactionsQuery(undefined, 21),
    keyset: bankTransactionsQuery({ receivedAt: '2099-01-01T02:00:00Z', id: 'bank-plan-7200' }, 21),
    counts: bankCountsQuery,
  };
  for (const [label, query] of Object.entries(queries)) {
    const plan = (
      await db.$queryRaw<{ 'QUERY PLAN': string }[]>(Prisma.sql`EXPLAIN (ANALYZE,BUFFERS) ${query}`)
    )
      .map((r) => r['QUERY PLAN'])
      .join('\n');
    process.stdout.write(
      `\nTIP-V46-806 ${label}, actual deployed index clones,10000 transactions:\n${plan}\n`,
    );
    expect(plan, label).not.toMatch(/Seq Scan on (payment_transactions|users)\b/);
    expect(plan, label).toMatch(/Index (Only )?Scan|Bitmap Index Scan/);
  }
});
