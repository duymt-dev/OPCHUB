import { createPrismaClient, type DbClient, type Prisma } from '@opchub/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { loadEnv } from '@/common/config';
import { ProjectRepository } from '@/modules/project/repositories/project.repository';
import { seedProjectPlanTables } from './project-feed-plan.fixture';

describe('TIP-V42-711 actual project feed SQL EXPLAIN', () => {
  let db: DbClient;
  let repository: ProjectRepository;
  const queries: Prisma.QueryEvent[] = [];
  let recording = false;

  beforeAll(async () => {
    db = createPrismaClient(loadEnv().DATABASE_URL, {
      max: 1,
      onQuery: (event) => {
        if (recording && /FROM ("public"\."projects"|projects) /.test(event.query))
          queries.push(event);
      },
    });
    repository = new ProjectRepository({ db, onModuleDestroy: () => db.$disconnect() });
    await seedProjectPlanTables(db);
  });
  // Disconnect drops all connection-local tables. No native row cleanup/reset is needed.
  afterAll(async () => db?.$disconnect());

  async function explain(query: Prisma.QueryEvent) {
    const sql = query.query.replace(
      /"public"\."(projects|users|membership_fees|project_members|project_shares|groups|group_members)"/g,
      '"pg_temp"."$1"',
    );
    const params = z.array(z.unknown()).parse(JSON.parse(query.params));
    // SQL comes only from Prisma's query event, never from user input. Preserve all predicates.
    const rows = await db.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(
      `EXPLAIN (ANALYZE, BUFFERS) ${sql}`,
      ...params,
    );
    return rows.map((row) => row['QUERY PLAN']).join('\n');
  }

  it.each([undefined, 'plan-s-0'])('10000 projects and fees: storeId=%s', async (storeId) => {
    queries.length = 0;
    recording = true;
    await repository.explore('plan-viewer', { sort: 'new', storeId }, 1, 20, new Date());
    recording = false;
    const page = queries.find((event) => event.query.includes('ORDER BY'));
    const count = queries.find((event) => event.query.includes('COUNT('));
    expect(page).toBeDefined();
    expect(count).toBeDefined();
    if (!page || !count) throw new Error('Repository did not emit page and count SQL');
    const pagePlan = await explain(page);
    const countPlan = await explain(count);
    process.stdout.write(
      `\nProject feed ${storeId ?? 'explore'} PAGE:\n${pagePlan}\nCOUNT:\n${countPlan}\n`,
    );
    expect(pagePlan).not.toMatch(/Seq Scan on (projects|membership_fees)\b/);
    expect(countPlan).not.toMatch(/Seq Scan on (projects|membership_fees)\b/);
    expect(pagePlan).toMatch(/Index (Only )?Scan|Bitmap Index Scan/);
    if (storeId) expect(pagePlan).toContain('store_id =');
    const pageRows = await db.$queryRawUnsafe<{ id: string }[]>(
      page.query,
      ...z.array(z.unknown()).parse(JSON.parse(page.params)),
    );
    const totalRows = await db.$queryRawUnsafe<{ total: number }[]>(
      count.query,
      ...z.array(z.unknown()).parse(JSON.parse(count.params)),
    );
    expect(pageRows).toHaveLength(20);
    expect(pageRows[0]?.id).toBe(storeId ? 'plan-p-100' : 'plan-p-20');
    expect(totalRows[0]?.total).toBe(storeId ? 100 : 500);
  });
});
