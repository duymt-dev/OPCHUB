import { createPrismaClient, Prisma, type DbClient } from '@opchub/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadEnv } from '@/common/config';
import { storeSearchQuery } from '@/modules/local-business/repositories/store-search.query';
import {
  containsNeedSearchQuery,
  needSearchQuery,
} from '@/modules/local-business/repositories/need-search.query';
import { projectSearchQuery } from '@/modules/project/repositories/project-search.query';
import { groupSearchQuery } from '@/modules/community/repositories/group-search.query';
import { memberGlobalSearchQuery } from '@/modules/account/repositories/member-global-search.query';
import { seedSearchPlanTables } from './search-plan.fixture';

describe('TIP-V46-808 actual production search SQL / 10000 rows per domain', () => {
  let db: DbClient;
  beforeAll(async () => {
    db = createPrismaClient(loadEnv().DATABASE_URL, { max: 1 });
    await seedSearchPlanTables(db);
  });
  afterAll(async () => db?.$disconnect());
  const now = new Date();
  const queries = [
    ['stores', (q: string) => storeSearchQuery(q, false, now)],
    ['needs', (q: string) => needSearchQuery(q, false, now)],
    ['projects', (q: string) => projectSearchQuery(q, 'viewer', false, now)],
    ['groups', (q: string) => groupSearchQuery(q, 'viewer')],
    ['users', memberGlobalSearchQuery],
  ] as const;
  it.each(queries)(
    '%s uses its migrated GIN without Seq Scan; 2-char measured independently',
    async (table, query) => {
      const rows = await db.$queryRaw<{ 'QUERY PLAN': string }[]>(
        Prisma.sql`EXPLAIN (ANALYZE,BUFFERS) ${query('Needle')}`,
      );
      const plan = rows.map((r) => r['QUERY PLAN']).join('\n');
      process.stdout.write(`\n${table} >=3 chars:\n${plan}\n`);
      // PostgreSQL renames indexes when LIKE INCLUDING ALL clones them into pg_temp.
      // The cloned expression indexes are byte-for-byte from the applied migrations.
      expect(plan).toMatch(/Bitmap Index Scan/);
      expect(plan).toContain('immutable_unaccent');
      expect(plan).not.toMatch(new RegExp(`Seq Scan on ${table}\\b`));
      expect(await db.$queryRaw(query('Needle'))).toHaveLength(4);
      const short = await db.$queryRaw<{ 'QUERY PLAN': string }[]>(
        Prisma.sql`EXPLAIN (ANALYZE,BUFFERS) ${query('Ne')}`,
      );
      process.stdout.write(
        `\n${table} 2 chars (target <50ms):\n${short.map((r) => r['QUERY PLAN']).join('\n')}\n`,
      );
    },
  );
  it.each(['Ne', 'Ot', 'fe', '%_'])(
    'two-character prefix/fallback keeps exact contains ordering: %s',
    async (q) => {
      for (const admin of [false, true]) {
        const original = await db.$queryRaw(containsNeedSearchQuery(q, admin, now));
        expect(await db.$queryRaw(needSearchQuery(q, admin, now))).toEqual(original);
      }
    },
  );
});
