import { createPrismaClient, Prisma, type DbClient } from '@opchub/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadEnv } from '@/common/config';
import {
  matchCandidatesQuery,
  matchStoreQuery,
  type MatchStoreRow,
} from '@/modules/local-business/repositories/need-match.query';

describe('REQ-626 actual matches SQL on10000 needs, >=2000 candidates', () => {
  let db: DbClient;
  const store: MatchStoreRow = {
    id: 's1',
    field: 'Food',
    province: 'P',
    intro: '',
    productNames: [],
    status: 'published',
  };
  beforeAll(async () => {
    db = createPrismaClient(loadEnv().DATABASE_URL, { max: 1 });
    // Trusted static identifiers only; no public fixture changes, indexes cloned from migrations.
    for (const table of ['users', 'stores', 'store_items', 'needs', 'membership_fees']) {
      await db.$executeRawUnsafe(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING ALL)`);
    }
    await db.$executeRaw`INSERT INTO pg_temp.users (id,member_code,full_name,email,account_type,updated_at)
      SELECT 'u'||n,'TV'||lpad(n::text,6,'0'),'Plan '||n,n||'@plan.test','business',now() FROM generate_series(1,10001)n`;
    await db.$executeRaw`INSERT INTO pg_temp.membership_fees (user_id,status,amount,valid_until,updated_at)
      SELECT 'u'||n,'active',1,now()+interval '1 year',now() FROM generate_series(1,10001)n`;
    await db.$executeRaw`INSERT INTO pg_temp.stores (id,owner_id,name,status,field,province,updated_at)
      SELECT 's'||n,'u'||n,'Store '||n,'published','Food','P',now() FROM generate_series(1,10001)n`;
    await db.$executeRaw`INSERT INTO pg_temp.store_items (id,store_id,kind,name,sort)
      SELECT 'i'||n,'s'||n,'product','Robusta',0 FROM generate_series(1,10001)n`;
    await db.$executeRaw`INSERT INTO pg_temp.needs (id,store_id,owner_id,type,title,description,field,province,phone,updated_at)
      SELECT 'n'||n,'s'||n,'u'||n,'buy','Robusta '||n,repeat('wide payload ',300),
      CASE WHEN n<=2501 THEN 'Food' ELSE 'Other' END,
      CASE WHEN n<=2001 THEN 'P' ELSE 'Other' END,'0912345678',now()-n*interval '1 second'
      FROM generate_series(2,10001)n`;
    for (const table of ['users', 'stores', 'store_items', 'needs', 'membership_fees']) {
      await db.$executeRawUnsafe(`VACUUM (ANALYZE) pg_temp.${table}`);
    }
  });
  afterAll(async () => db?.$disconnect());
  it('own store query seeks unique owner and indexed products in one statement', async () => {
    const sql = matchStoreQuery('u1');
    const plan = (
      await db.$queryRaw<{ 'QUERY PLAN': string }[]>(Prisma.sql`EXPLAIN (ANALYZE,BUFFERS) ${sql}`)
    )
      .map((r) => r['QUERY PLAN'])
      .join('\n');
    process.stdout.write(`\nneed matches store:\n${plan}\n`);
    expect(plan).toMatch(/Index (Only )?Scan|Bitmap Index Scan/);
    expect(plan).not.toMatch(/Seq Scan on (stores|store_items)\b/);
    const rows = await db.$queryRaw<MatchStoreRow[]>(sql);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.productNames).toEqual(['Robusta']);
  });
  it('candidate query uses existing status/order index, no needs Seq Scan, <=200 payload rows', async () => {
    const sql = matchCandidatesQuery('u1', store, new Date());
    const plan = (
      await db.$queryRaw<{ 'QUERY PLAN': string }[]>(Prisma.sql`EXPLAIN (ANALYZE,BUFFERS) ${sql}`)
    )
      .map((r) => r['QUERY PLAN'])
      .join('\n');
    process.stdout.write(`\nneed matches candidates:\n${plan}\n`);
    expect(plan).toMatch(/Index (Only )?Scan|Bitmap Index Scan/);
    expect(plan).not.toMatch(/Seq Scan on needs\b/);
    expect(plan).toMatch(/status_updated_at_id|status_province_field_updated_at/);
    const rows = await db.$queryRaw<{ id: string; updatedAt: Date }[]>(sql);
    expect(rows).toHaveLength(200);
    expect(rows[0]?.id).toBe('n2');
    expect(rows[199]?.id).toBe('n201');
  });
});
