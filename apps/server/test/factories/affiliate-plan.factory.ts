import type { DbClient } from '@opchub/db';

/** Session-local actual deployed schema/index clones. No user data or public tables mutated. */
export async function seedAffiliateHistoryPlan(db: DbClient) {
  await db.$executeRaw`CREATE TEMP TABLE users (LIKE public.users INCLUDING ALL)`;
  await db.$executeRaw`CREATE TEMP TABLE affiliates (LIKE public.affiliates INCLUDING ALL)`;
  await db.$executeRaw`CREATE TEMP TABLE referrals (LIKE public.referrals INCLUDING ALL)`;
  await db.$executeRaw`CREATE TEMP TABLE commissions (LIKE public.commissions INCLUDING ALL)`;
  // LIKE does not copy foreign keys; API integration separately exercises the real FK tables.
  await db.$executeRaw`
    INSERT INTO users (id,member_code,account_type,full_name,email,updated_at)
    SELECT 'u' || n::text,'U' || n::text,'personal',
      CASE WHEN n=1 THEN 'Nguyễn Trà My' ELSE 'Plan member ' || n::text END,
      'plan' || n::text || '@test.opchub.vn',now() FROM generate_series(1,20000) n`;
  await db.$executeRaw`
    INSERT INTO affiliates (id,user_id,code,rate,created_at,updated_at)
    SELECT 'a' || n::text,'u' || n::text,'Z' || lpad(n::text,5,'0'),20,
      '2026-09-01'::timestamptz + n * interval '1 second',now() FROM generate_series(1,10000) n`;
  await db.$executeRaw`
    INSERT INTO referrals (id,affiliate_id,affiliate_code,referred_user_id,status,month_key,created_at)
    SELECT 'r' || n::text,'a' || (1+(n-1)%100)::text,'Z' || lpad((1+(n-1)%100)::text,5,'0'),
      'u' || n::text,CASE WHEN n<=10000 THEN 'converted' ELSE 'pending' END::referral_status,
      CASE WHEN n<=10000 THEN '2026-09' ELSE '2026-08' END,
      '2026-09-01'::timestamptz + n * interval '1 second' FROM generate_series(1,20000) n`;
  await db.$executeRaw`
    INSERT INTO commissions (id,affiliate_id,referred_user_id,fee_period_id,list_amount,amount,rate,
      month_key,plan,status,paid_at,paid_bank_snapshot,created_at)
    SELECT 'c' || n::text,'a' || (1+(n-1)%100)::text,'u' || n::text,'p' || n::text,600000,120000,20,
      '2026-09','personal',CASE WHEN n%3=0 THEN 'paid' ELSE 'recorded' END::commission_status,
      CASE WHEN n%3=0 THEN '2026-09-30'::timestamptz + n * interval '1 second' ELSE NULL END,
      CASE WHEN n%3=0 THEN jsonb_build_object('bankName','ACB','bankNo','0123456789',
        'bankHolder','NGUYEN VAN AN','payoutId',n::text) ELSE NULL END,
      '2026-09-01'::timestamptz + n * interval '1 second' FROM generate_series(1,10000) n`;
  // Normal maintenance, never disable Seq Scan or alter planner costs.
  await db.$executeRaw`VACUUM (ANALYZE) users`;
  await db.$executeRaw`VACUUM (ANALYZE) affiliates`;
  await db.$executeRaw`VACUUM (ANALYZE) referrals`;
  await db.$executeRaw`VACUUM (ANALYZE) commissions`;
}
