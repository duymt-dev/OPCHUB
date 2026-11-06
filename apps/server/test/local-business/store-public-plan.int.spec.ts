import { createPrismaClient, Prisma, type DbClient } from '@opchub/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadEnv } from '@/common/config';
import { storePublicQuery } from '@/modules/local-business/repositories/store-public.repository';

describe('REQ-627 public SQL on10000 wide stores and items', () => {
  let db: DbClient;
  beforeAll(async () => {
    db = createPrismaClient(loadEnv().DATABASE_URL, { max: 1 });
    for (const table of ['users', 'membership_fees', 'stores', 'store_items']) {
      await db.$executeRawUnsafe(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING ALL)`);
    }
    await db.$executeRaw`INSERT INTO pg_temp.users(id,member_code,full_name,email,account_type,updated_at)
      SELECT 'u'||n,'TV'||lpad(n::text,6,'0'),'Business '||n,n||'@plan.test','business',now() FROM generate_series(1,10000)n`;
    await db.$executeRaw`INSERT INTO pg_temp.membership_fees(user_id,status,amount,valid_until,updated_at)
      SELECT 'u'||n,'active',1,now()+interval '1 year',now() FROM generate_series(1,10000)n`;
    await db.$executeRaw`INSERT INTO pg_temp.stores(id,owner_id,name,slug,status,intro,updated_at)
      SELECT 's'||n,'u'||n,'Store '||n,'plan-store-'||n,'published',repeat('wide description ',300),now() FROM generate_series(1,10000)n`;
    await db.$executeRaw`INSERT INTO pg_temp.store_items(id,store_id,kind,name,description,sort)
      SELECT 'i'||n,CASE WHEN n<=100 THEN 's1' ELSE 's'||n END,'product','Product '||n,repeat('payload ',100),n FROM generate_series(1,10000)n`;
    for (const table of ['users', 'membership_fees', 'stores', 'store_items']) {
      await db.$executeRawUnsafe(`VACUUM (ANALYZE) pg_temp.${table}`);
    }
  });
  afterAll(() => db?.$disconnect());
  it('unique slug seek plus indexed visibility, no wide stores Seq Scan', async () => {
    const query = storePublicQuery('plan-store-1', new Date());
    const plan = (
      await db.$queryRaw<{ 'QUERY PLAN': string }[]>(
        Prisma.sql`EXPLAIN (ANALYZE, BUFFERS) ${query}`,
      )
    )
      .map((r) => r['QUERY PLAN'])
      .join('\n');
    process.stdout.write(`\npublic store lookup:\n${plan}\n`);
    expect(plan).toMatch(/Index (Only )?Scan|Bitmap Index Scan/);
    expect(plan).toMatch(/stores_slug/);
    expect(plan).not.toMatch(/Seq Scan on (stores|users|membership_fees)\b/);
    expect(await db.$queryRaw(query)).toHaveLength(1);
  });
  it('items: indexed store_id/sort, bounded50 results in deterministic order', async () => {
    const query = Prisma.sql`SELECT name,kind,description,image_url,price FROM store_items WHERE store_id='s1' ORDER BY sort,id LIMIT 50`;
    const plan = (
      await db.$queryRaw<{ 'QUERY PLAN': string }[]>(
        Prisma.sql`EXPLAIN (ANALYZE, BUFFERS) ${query}`,
      )
    )
      .map((r) => r['QUERY PLAN'])
      .join('\n');
    process.stdout.write(`\npublic store items:\n${plan}\n`);
    expect(plan).toMatch(/Index (Only )?Scan|Bitmap Index Scan/);
    expect(plan).not.toMatch(/Seq Scan on store_items\b/);
    const items = await db.$queryRaw<{ name: string }[]>(query);
    expect(items).toHaveLength(50);
    expect(items[0]?.name).toBe('Product 1');
    expect(items[49]?.name).toBe('Product 50');
  });
});
