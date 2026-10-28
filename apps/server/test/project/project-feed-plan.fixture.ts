import type { DbClient } from '@opchub/db';

/** Connection-local clones preserve migrated indexes, without changing native demo/test rows. */
export async function seedProjectPlanTables(db: DbClient) {
  await db.$executeRaw`CREATE TEMP TABLE projects (LIKE public.projects INCLUDING ALL)`;
  await db.$executeRaw`CREATE TEMP TABLE users (LIKE public.users INCLUDING ALL)`;
  await db.$executeRaw`CREATE TEMP TABLE membership_fees (LIKE public.membership_fees INCLUDING ALL)`;
  await db.$executeRaw`CREATE TEMP TABLE project_members (LIKE public.project_members INCLUDING ALL)`;
  await db.$executeRaw`CREATE TEMP TABLE project_shares (LIKE public.project_shares INCLUDING ALL)`;
  await db.$executeRaw`CREATE TEMP TABLE groups (LIKE public.groups INCLUDING ALL)`;
  await db.$executeRaw`CREATE TEMP TABLE group_members (LIKE public.group_members INCLUDING ALL)`;
  await db.$executeRaw`
    INSERT INTO pg_temp.users (id, member_code, account_type, full_name, email, updated_at)
    SELECT 'plan-u-' || n, 'PLAN' || n, 'personal', 'Plan fixture',
      'plan-' || n || '@example.test', now()
    FROM generate_series(1, 10000) n`;
  await db.$executeRaw`
    INSERT INTO pg_temp.membership_fees (user_id, status, valid_until, amount, updated_at)
    SELECT 'plan-u-' || n,
      (CASE WHEN n % 20 = 0 THEN 'active' ELSE 'expired' END)::membership_fee_status,
      CASE WHEN n % 20 = 0 THEN now() + interval '1 year' ELSE now() - interval '1 year' END,
      1, now()
    FROM generate_series(1, 10000) n`;
  await db.$executeRaw`
    INSERT INTO pg_temp.projects (id, owner_id, store_id, status, published_at, updated_at)
    SELECT 'plan-p-' || n, 'plan-u-' || n, 'plan-s-' || (n % 100),
      (CASE WHEN n % 10 = 0 THEN 'published' ELSE 'draft' END)::project_status,
      now() - n * interval '1 minute', now()
    FROM generate_series(1, 10000) n`;
  await db.$executeRaw`VACUUM (ANALYZE) pg_temp.projects`;
  await db.$executeRaw`VACUUM (ANALYZE) pg_temp.users`;
  await db.$executeRaw`VACUUM (ANALYZE) pg_temp.membership_fees`;
  await db.$executeRaw`ANALYZE pg_temp.project_members`;
  await db.$executeRaw`ANALYZE pg_temp.project_shares`;
  await db.$executeRaw`ANALYZE pg_temp.groups`;
  await db.$executeRaw`ANALYZE pg_temp.group_members`;
}
