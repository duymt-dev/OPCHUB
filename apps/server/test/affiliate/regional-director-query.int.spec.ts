import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Prisma } from '@opchub/db';
import { directorMemberQueries } from '@/modules/account/repositories/director-member.query';
import { directorHistoryQuery } from '@/modules/affiliate/repositories/regional-director-history.query';
import { createTestApp, type TestApp } from '../setup/test-app';

/** Actual planner evidence; never disable scans or change planner cost settings. */
function planNodes(value: unknown): { type: string; relation: string; index: string }[] {
  const found: { type: string; relation: string; index: string }[] = [];
  const visit = (item: unknown) => {
    if (!item || typeof item !== 'object') return;
    const row = item as Record<string, unknown>;
    if (typeof row['Node Type'] === 'string')
      found.push({
        type: row['Node Type'],
        relation: typeof row['Relation Name'] === 'string' ? row['Relation Name'] : '',
        index: typeof row['Index Name'] === 'string' ? row['Index Name'] : '',
      });
    Object.values(row).forEach(visit);
  };
  visit(value);
  return found;
}

describe('REQ-616 EXPLAIN 10k director search/history', () => {
  let t: TestApp;
  const tag = randomUUID();
  const actorId = `director-query-${tag}`;
  beforeAll(async () => {
    t = await createTestApp();
    await t.prisma.db.user.createMany({
      data: Array.from({ length: 10_000 }, (_, i) => ({
        id: `${actorId}-${i}`,
        memberCode: `${tag}-${i}`,
        fullName: `DirectorPlan-${tag}-${i}`,
        email: `${tag}-${i}@query.example.test`,
        accountType: 'personal' as const,
      })),
    });
    await t.prisma.db.regionalDirectorHistory.createMany({
      data: Array.from({ length: 10_000 }, (_, i) => ({
        // Skewed regional activity proves the equality-leading index can seek a selective region.
        region: i % 1000 ? ('central' as const) : ('north' as const),
        action: 'appointed',
        actorId,
        actorName: 'Query test actor',
        actorRole: 'Query test role',
        summary: `Entry ${i}`,
        createdAt: new Date(Date.UTC(2000, 0, 1) + i * 1000),
      })),
    });
    await t.prisma.db.$executeRaw`ANALYZE users`;
    await t.prisma.db.$executeRaw`ANALYZE regional_director_history`;
  });
  afterAll(async () => {
    await t.prisma.db.regionalDirectorHistory.deleteMany({ where: { actorId } });
    await t.prisma.db.user.deleteMany({ where: { id: { startsWith: actorId } } });
    await t.close();
  });

  async function explain(query: Prisma.Sql) {
    const result = await t.prisma.db.$queryRaw<{ 'QUERY PLAN': unknown }[]>`
      EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
    const nodes = planNodes(result);
    process.stdout.write(`REQ-616 EXPLAIN ${JSON.stringify(nodes)}\n`);
    return nodes;
  }

  it('member page and count use the production indexed expression and deferred join', async () => {
    const query = directorMemberQueries({ q: `DirectorPlan-${tag}-4999`, page: 1, size: 20 }, []);
    const rows = await t.prisma.db.$queryRaw<{ id: string }[]>(query.page);
    expect(rows.map((r) => r.id)).toEqual([`${actorId}-4999`]);
    for (const nodes of await Promise.all([explain(query.page), explain(query.count)])) {
      expect(nodes.some((n) => n.relation === 'users' && n.type === 'Seq Scan')).toBe(false);
      expect(nodes.some((n) => n.index === 'users_director_search')).toBe(true);
    }
  });

  it('regional history uses its compound covering keyset index on 10k rows', async () => {
    const nodes = await explain(
      directorHistoryQuery({
        region: 'north',
        size: 20,
        beforeAt: '2000-01-01T01:00:00.000Z',
        beforeId: randomUUID(),
      }),
    );
    expect(
      nodes.some((n) => n.relation === 'regional_director_history' && n.type === 'Seq Scan'),
    ).toBe(false);
    expect(nodes.some((n) => n.index === 'regional_director_history_region_keyset')).toBe(true);
  });
});
