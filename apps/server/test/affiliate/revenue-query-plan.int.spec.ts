import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Prisma } from '@opchub/db';
import { revenuePayoutHistoryQuery } from '@/modules/affiliate/repositories/revenue-payout-history.query';
import { revenuePayoutLockQuery } from '@/modules/affiliate/repositories/revenue-payout-lock.query';
import { reanchorUnpaidQuery } from '@/modules/affiliate/repositories/revenue-reanchor.query';
import { createRevenueApp } from './revenue-sharing.fixture';
import type { TestApp } from '../setup/test-app';

type PlanNode = {
  'Node Type': string;
  'Relation Name'?: string;
  'Index Name'?: string;
  Plans?: PlanNode[];
};
type Explain = { 'QUERY PLAN': { Plan: PlanNode; 'Execution Time': number }[] }[];
function nodes(plan: PlanNode): PlanNode[] {
  return [plan, ...(plan.Plans ?? []).flatMap(nodes)];
}

describe('REQ-617 revenue queries on >=10k real rows', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createRevenueApp();
  });
  afterAll(async () => {
    await t?.close();
  });

  it('history/cursor/locking/reanchor seek indexes without large-table sequential scans', async () => {
    const prefix = `explain-${randomUUID()}-`;
    const rollback = new Error('Rollback synthetic EXPLAIN fixtures');
    const plans: Record<string, Explain> = {};
    await expect(
      t.prisma.db.$transaction(async (tx) => {
        await tx.$executeRaw`
        INSERT INTO revenue_payouts (id, request_key, director_id, director_name, region, month_key,
          amount, share_count, bank_name, bank_no, bank_holder, paid_by, paid_at)
        SELECT gen_random_uuid()::text, ${prefix} || n::text, ${prefix} || (n % 100)::text,
          'EXPLAIN Director', 'north', '2026-09', 51, 1, 'Vietcombank', '0123456789', 'DIRECTOR',
          'explain-actor', '2026-10-01'::timestamptz + n * interval '1 second'
        FROM generate_series(1, 10000) n`;
        await tx.$executeRaw`
        INSERT INTO revenue_shares (id, source, source_id, plan, customer_id, affiliate_id, region,
          director_id, director_name, received_at, recorded_at, first_received_at, customer_year,
          amount, year_one_rate, annual_decrease, minimum_rate, director_rate, director_amount, media_soft_amount, month_key)
        SELECT gen_random_uuid()::text, 'membership', ${prefix} || n::text, 'personal',
          ${prefix} || (n % 100)::text, 'explain-affiliate', 'north', ${prefix} || (n % 100)::text,
          'EXPLAIN Director', '2026-09-10', '2026-09-11', '2026-09-10', 1, 101, 50, 10, 20, 50, 51, 50, '2026-09'
        FROM generate_series(1, 10000) n`;
        await tx.$executeRaw`ANALYZE revenue_payouts`;
        await tx.$executeRaw`ANALYZE revenue_shares`;
        const directorId = `${prefix}1`;
        // Execute exactly the exported production SQL, including UPDATE/FOR UPDATE; transaction rolls back.
        plans.history = await tx.$queryRaw<Explain>(
          Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${revenuePayoutHistoryQuery({ directorId, size: 20 })}`,
        );
        plans.historyCursor = await tx.$queryRaw<Explain>(
          Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${revenuePayoutHistoryQuery({ directorId, size: 20, beforeAt: '2026-10-01T01:00:00Z', beforeId: randomUUID() })}`,
        );
        plans.globalHistory = await tx.$queryRaw<Explain>(
          Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${revenuePayoutHistoryQuery({ size: 20 })}`,
        );
        plans.payable = await tx.$queryRaw<Explain>(
          Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${revenuePayoutLockQuery(directorId, '2026-09')}`,
        );
        plans.reanchor = await tx.$queryRaw<Explain>(
          Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${reanchorUnpaidQuery(directorId, new Date('2025-09-10'))}`,
        );
        for (const plan of Object.values(plans)) {
          const root = plan[0]?.['QUERY PLAN'][0]?.Plan;
          expect(root).toBeDefined();
          if (!root) throw new Error('Missing EXPLAIN');
          expect(
            nodes(root).filter(
              (n) =>
                n['Node Type'] === 'Seq Scan' &&
                ['revenue_shares', 'revenue_payouts'].includes(n['Relation Name'] ?? ''),
            ),
          ).toEqual([]);
          expect(nodes(root).some((n) => n['Index Name'])).toBe(true);
        }
        throw rollback;
      }),
    ).rejects.toBe(rollback);
    const dir = resolve('../../e2e/.parity-out');
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'v46-802-revenue-query-plans.json'), JSON.stringify(plans, null, 2));
  });
});
