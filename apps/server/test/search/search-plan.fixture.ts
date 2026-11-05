import type { DbClient } from '@opchub/db';

/** Connection-local clones retain migrated indexes; disconnect removes every fixture. */
export async function seedSearchPlanTables(db: DbClient) {
  for (const table of [
    'users',
    'stores',
    'needs',
    'projects',
    'groups',
    'group_members',
    'membership_fees',
    'project_members',
    'project_shares',
    'categories',
  ]) {
    // Static table names above, never request data.
    await db.$executeRawUnsafe(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING ALL)`);
  }
  await db.$executeRaw`INSERT INTO pg_temp.users (id,member_code,full_name,email,account_type,updated_at)
    SELECT 'u'||n,'TV'||lpad(n::text,6,'0'), CASE WHEN n<=5 THEN 'Needle coffee '||n ELSE 'Other user '||n END,
      n||'@plan.test','personal',now() FROM generate_series(1,10000)n`;
  await db.$executeRaw`INSERT INTO pg_temp.membership_fees (user_id,status,amount,valid_until,updated_at)
    SELECT 'u'||n,'active',1,now()+interval '1 year',now() FROM generate_series(1,10000)n`;
  await db.$executeRaw`INSERT INTO pg_temp.stores (id,owner_id,name,status,updated_at)
    SELECT 's'||n,'u'||n,CASE WHEN n<=5 THEN 'Needle coffee '||n ELSE 'Other store '||n END,'published',now()
    FROM generate_series(1,10000)n`;
  await db.$executeRaw`INSERT INTO pg_temp.needs (id,store_id,owner_id,type,title,description,field,province,phone,updated_at)
    SELECT 'n'||n,'s'||n,'u'||n,'buy',CASE WHEN n<=5 THEN 'Needle coffee '||n ELSE 'Other need '||n END,'','','','0912345678',now()
    FROM generate_series(1,10000)n`;
  await db.$executeRaw`INSERT INTO pg_temp.projects (id,owner_id,name,status,visibility,published_at,updated_at)
    SELECT 'p'||n,'u'||n,CASE WHEN n<=5 THEN 'Needle coffee '||n ELSE 'Other project '||n END,
    'published','public',now(),now() FROM generate_series(1,10000)n`;
  await db.$executeRaw`INSERT INTO pg_temp.groups (id,slug,name,province,region,updated_at)
    SELECT 'g'||n,'g'||n,CASE WHEN n<=5 THEN 'Needle coffee '||n ELSE 'Other group '||n END,'Plan province '||n,'central',now()
    FROM generate_series(1,10000)n`;
  for (const table of ['users', 'stores', 'needs', 'projects', 'groups', 'membership_fees']) {
    await db.$executeRawUnsafe(`VACUUM (ANALYZE) pg_temp.${table}`);
  }
}
