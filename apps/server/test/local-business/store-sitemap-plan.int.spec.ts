import { createPrismaClient, Prisma, type DbClient } from '@opchub/db';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { loadEnv } from '@/common/config';
import {
  storeSitemapQuery,
  storeOwnerSlugsQuery,
  type StoreSitemapRow,
} from '@/modules/local-business/repositories/store-sitemap.query';

describe('REQ-627 B15 actual sitemap and owner-slug plans on10000 wide stores', () => {
  let db: DbClient;
  beforeAll(async () => {
    db = createPrismaClient(loadEnv().DATABASE_URL, { max: 1 });
    // Trusted constant identifiers; TEMP clone retains deployed indexes, never mutates public rows.
    for (const table of ['users', 'membership_fees', 'stores'])
      await db.$executeRawUnsafe(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING ALL)`);
    await db.$executeRaw`INSERT INTO pg_temp.users(id,member_code,full_name,email,account_type,updated_at)
      SELECT 'u'||n,'TV'||lpad(n::text,6,'0'),'Plan '||n,n||'@820plan.test','business',now() FROM generate_series(1,10000)n`;
    await db.$executeRaw`INSERT INTO pg_temp.membership_fees(user_id,status,amount,valid_until,updated_at)
      SELECT 'u'||n,'active',1,now()+interval '1 year',now() FROM generate_series(1,10000)n`;
    await db.$executeRaw`INSERT INTO pg_temp.stores(id,owner_id,slug,name,intro,status,seo_index,updated_at)
      SELECT 's'||n,'u'||n,'store-'||n,'Store '||n,repeat('wide payload ',300),'published',n%10<>0,
      now()-n*interval '1 second' FROM generate_series(1,10000)n`;
    for (const table of ['users', 'membership_fees', 'stores'])
      await db.$executeRawUnsafe(`VACUUM (ANALYZE) pg_temp.${table}`);
  });
  afterAll(async () => db?.$disconnect());
  async function explain(name: string, sql: Prisma.Sql) {
    const plan = (
      await db.$queryRaw<{ 'QUERY PLAN': string }[]>(Prisma.sql`EXPLAIN (ANALYZE,BUFFERS) ${sql}`)
    )
      .map((r) => r['QUERY PLAN'])
      .join('\n');
    process.stdout.write(`\nTIP820 ${name}:\n${plan}\n`);
    expect(plan).toMatch(/Index (Only )?Scan|Bitmap Index Scan/);
    expect(plan).not.toMatch(/Seq Scan on stores\b/);
    return plan;
  }
  it('REQ-627 covering sitemap index + keyset returns1001 IDs, no wide heap payload', async () => {
    const now = new Date(),
      sql = storeSitemapQuery(now);
    const plan = await explain('sitemap', sql);
    expect(plan).toMatch(/Index Only Scan.*stores_updated_at_id_owner_id_slug/);
    const first = await db.$queryRaw<StoreSitemapRow[]>(sql);
    expect(first).toHaveLength(1001);
    const last = first[999];
    if (!last) throw new Error('Missing first-page cursor');
    const next = storeSitemapQuery(now, { at: last.at, id: last.id });
    await explain('sitemap-cursor', next);
    const second = await db.$queryRaw<StoreSitemapRow[]>(next);
    const ids = new Set(first.slice(0, 1000).map((r) => r.id));
    expect(second.every((r) => !ids.has(r.id))).toBe(true);
  });
  it('REQ-627 multiple owner IDs use unique owner index, not a full store scan', async () => {
    const sql = storeOwnerSlugsQuery(['u1', 'u100', 'u9000']);
    expect(await explain('owner-slugs', sql)).toMatch(/owner_id/);
    expect(await db.$queryRaw<{ slug: string }[]>(sql)).toHaveLength(3);
  });
});
