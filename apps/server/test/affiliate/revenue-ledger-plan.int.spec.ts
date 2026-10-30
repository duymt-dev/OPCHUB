import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Prisma } from '@opchub/db';
import {
  revenueBalanceQuery,
  revenueLedgerQuery,
  revenueMonthsQuery,
} from '@/modules/affiliate/repositories/revenue-ledger.query';
import { createRevenueApp } from './revenue-sharing.fixture';
import { seedLedgerPlan, planNodes, type LedgerExplain } from './revenue-ledger-plan.fixture';
import type { TestApp } from '../setup/test-app';

describe('REQ-617 read-model EXPLAIN on >=10k rows', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createRevenueApp();
  });
  afterAll(async () => {
    await t?.close();
  });

  it('REQ-617 exact ledger/cursor/balance/month queries seek covering indexes with no large-table Seq Scan', async () => {
    const prefix = `ledger-plan-${randomUUID()}-`;
    const directorId = `${prefix}1`;
    const rollback = new Error('Rollback EXPLAIN fixture');
    const queries = {
      ledger: revenueLedgerQuery(directorId, { size: 8 }),
      cursor: revenueLedgerQuery(directorId, {
        size: 8,
        beforeAt: '2026-09-10T01:00:00Z',
        beforeId: randomUUID(),
      }),
      balance: revenueBalanceQuery(directorId),
      months: revenueMonthsQuery(directorId, { size: 3 }),
      monthCursor: revenueMonthsQuery(directorId, { size: 3, beforeMonth: '2026-08' }),
    };
    const plans: Record<string, LedgerExplain> = {};
    await expect(
      t.prisma.db.$transaction(async (tx) => {
        await seedLedgerPlan(tx, prefix);
        // EXPLAIN collection is a test-only loop, not a production request path.
        for (const [name, sql] of Object.entries(queries)) {
          const plan = await tx.$queryRaw<LedgerExplain>(
            Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`,
          );
          plans[name] = plan;
          const root = plan[0]?.['QUERY PLAN'][0]?.Plan;
          if (!root) throw new Error('Missing EXPLAIN');
          const nodes = planNodes(root);
          expect(
            nodes.filter(
              (n) => n['Node Type'] === 'Seq Scan' && n['Relation Name'] === 'revenue_shares',
            ),
          ).toEqual([]);
          expect(nodes.some((n) => n['Index Name']?.startsWith('revenue_shares_director_'))).toBe(
            true,
          );
        }
        throw rollback;
      }),
    ).rejects.toBe(rollback);
    const dir = resolve('../../e2e/.parity-out');
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'v46-802-ledger-query-plans.json'), JSON.stringify(plans, null, 2));
  });
});
