import { createPrismaClient, Prisma, type DbClient } from '@opchub/db';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { loadEnv } from '@/common/config';
import { commissionPageQuery } from '@/modules/affiliate/repositories/commission-admin.query';
import { auditLogPageQuery } from '@/modules/settings/repositories/audit-log.repository';
import { conversionQuery } from '@/modules/reporting/conversion.repository';

let db: DbClient;
async function seedCommissions() {
  await db.$executeRaw`CREATE TEMP TABLE affiliates (LIKE public.affiliates INCLUDING ALL)`;
  await db.$executeRaw`CREATE TEMP TABLE commissions (LIKE public.commissions INCLUDING ALL)`;
  await db.$executeRaw`ALTER TABLE pg_temp.commissions DROP CONSTRAINT commissions_amount_positive`;
  await db.$executeRaw`INSERT INTO affiliates(id,user_id,code,rate,updated_at)
    SELECT 'a'||n,'u'||n,'PLAN'||n,20,now() FROM generate_series(1,10000)n`;
  await db.$executeRaw`INSERT INTO commissions(id,affiliate_id,referred_user_id,fee_period_id,list_amount,amount,rate,month_key,plan,created_at)
    SELECT 'c'||n,'a'||n,'u'||n,'period'||n,1000000,CASE WHEN n%20=0 THEN 0 ELSE 200000 END,20,'2026-09','personal',
      '2026-09-01'::timestamptz+make_interval(secs=>n) FROM generate_series(1,10000)n`;
  await db.$executeRaw`ALTER TABLE pg_temp.commissions ADD CONSTRAINT commissions_amount_positive CHECK(amount>0) NOT VALID`;
  await db.$executeRaw`VACUUM (ANALYZE) affiliates`;
  await db.$executeRaw`VACUUM (ANALYZE) commissions`;
}
async function seedAudit() {
  await db.$executeRaw`CREATE TEMP TABLE audit_logs (LIKE public.audit_logs INCLUDING ALL)`;
  await db.$executeRaw`INSERT INTO audit_logs(id,action,entity,entity_id,summary,created_at)
    SELECT 'audit'||n,'plan','plan','plan',repeat('x',2000),'2026-09-01'::timestamptz+make_interval(secs=>n) FROM generate_series(1,10000)n`;
  await db.$executeRaw`VACUUM (ANALYZE) audit_logs`;
}
async function seedConversion() {
  await db.$executeRaw`CREATE TEMP TABLE users (LIKE public.users INCLUDING ALL)`;
  await db.$executeRaw`CREATE TEMP TABLE membership_fees (LIKE public.membership_fees INCLUDING ALL)`;
  await db.$executeRaw`CREATE TEMP TABLE groups (LIKE public.groups INCLUDING ALL)`;
  await db.$executeRaw`CREATE TEMP TABLE group_members (LIKE public.group_members INCLUDING ALL)`;
  await db.$executeRaw`CREATE TEMP TABLE regional_directors (LIKE public.regional_directors INCLUDING ALL)`;
  await db.$executeRaw`INSERT INTO users(id,member_code,account_type,full_name,email,updated_at)
    SELECT 'u'||n,'TV'||lpad(n::text,6,'0'),'personal','Plan '||n,'plan'||n||'@plan.invalid',now() FROM generate_series(1,10000)n`;
  await db.$executeRaw`INSERT INTO membership_fees(user_id,status,amount,updated_at)
    SELECT 'u'||n,(CASE n%3 WHEN 0 THEN 'trial' WHEN 1 THEN 'active' ELSE 'expired' END)::membership_fee_status,1200000,now() FROM generate_series(1,10000)n`;
  await db.$executeRaw`INSERT INTO groups(id,slug,province,region,name,updated_at)
    SELECT 'g'||n,'g'||n,'Plan province '||n,(CASE n WHEN 1 THEN 'north' WHEN 2 THEN 'central' ELSE 'south' END)::region,'Plan group '||n,now() FROM generate_series(1,3)n`;
  await db.$executeRaw`INSERT INTO group_members(group_id,user_id,updated_at)
    SELECT 'g'||(1+n%3),'u'||n,now() FROM generate_series(1,10000)n`;
  await db.$executeRaw`VACUUM (ANALYZE) users`;
  await db.$executeRaw`VACUUM (ANALYZE) membership_fees`;
  await db.$executeRaw`VACUUM (ANALYZE) groups`;
  await db.$executeRaw`VACUUM (ANALYZE) group_members`;
  await db.$executeRaw`VACUUM (ANALYZE) regional_directors`;
}
beforeAll(async () => {
  db = createPrismaClient(loadEnv().DATABASE_URL, { max: 1 });
  await seedCommissions();
  await seedAudit();
  await seedConversion();
});
afterAll(async () => {
  await db.$disconnect();
});

it('REQ-622/624/623 actual runtime queries,10000 rows,5% historical zero; indexed pages and no repeated member scan', async () => {
  const queries = {
    commissions: commissionPageQuery({ page: 251, size: 20, status: 'all' }, []),
    audit: auditLogPageQuery(new Date('2026-10-16'), 51),
    conversion: conversionQuery,
  };
  for (const [label, query] of Object.entries(queries)) {
    const rows = await db.$queryRaw<{ 'QUERY PLAN': string }[]>(
      Prisma.sql`EXPLAIN (ANALYZE,BUFFERS) ${query}`,
    );
    const plan = rows.map((r) => r['QUERY PLAN']).join('\n');
    process.stdout.write(`\nTIP-V46-807 ${label}, deployed-index clones10000:\n${plan}\n`);
    expect(plan).toMatch(/Index (Only )?Scan|Bitmap Index Scan/);
    if (label === 'conversion') {
      expect(plan).not.toMatch(/Seq Scan on group_members\b/);
      const data = await db.$queryRaw<{ paid: bigint }[]>(query);
      expect(data.reduce((sum, r) => sum + Number(r.paid), 0)).toBe(3334);
    } else {
      expect(plan).not.toMatch(/Seq Scan on (commissions|affiliates|audit_logs)\b/);
      expect(await db.$queryRaw(query)).toHaveLength(label === 'audit' ? 51 : 20);
    }
  }
});
