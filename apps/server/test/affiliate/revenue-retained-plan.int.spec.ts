import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Prisma } from '@opchub/db';
import type { RevenueRetained } from '@opchub/shared/api-domains';
import { revenueRetainedQuery } from '@/modules/affiliate/repositories/revenue-retained.query';
import { createRevenueApp } from './revenue-sharing.fixture';
import { seedLedgerPlan, planNodes, type LedgerExplain } from './revenue-ledger-plan.fixture';
import type { TestApp } from '../setup/test-app';

describe('REQ-617 retained read-model exact EXPLAIN and bigint sums', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createRevenueApp();
  });
  afterAll(async () => t?.close());

  it('seeks reserved covering index on >=10k stats/ledger rows without reading the ledger', async () => {
    const prefix = `retained-plan-${randomUUID()}-`;
    const rollback = new Error('rollback exact plan fixture');
    let evidence: LedgerExplain | undefined;
    await expect(
      t.prisma.db.$transaction(async (tx) => {
        await seedLedgerPlan(tx, prefix);
        await tx.$executeRaw`INSERT INTO stats_daily (day, metric, dimension, value)
        SELECT '2026-09-01'::date, ${prefix} || n, '', n FROM generate_series(1, 10000) n`;
        const [before] = await tx.$queryRaw<RevenueRetained[]>(revenueRetainedQuery());
        // Prove exact arithmetic independently of JS-safe number range.
        await tx.$executeRaw`INSERT INTO stats_daily (day, metric, dimension, value)
        VALUES ('2020-01-01', 'affiliate_revenue_retained', 'all', 9007199254740993)
        ON CONFLICT (day, metric, dimension) DO UPDATE
          SET value = stats_daily.value + EXCLUDED.value`;
        await tx.$executeRaw`ANALYZE stats_daily`;
        const [totals] = await tx.$queryRaw<RevenueRetained[]>(revenueRetainedQuery());
        expect(BigInt(totals?.allReceipts ?? '0') - BigInt(before?.allReceipts ?? '0')).toBe(
          9007199254740993n,
        );
        expect(totals?.affiliateAttributed).toBe(before?.affiliateAttributed);
        evidence = await tx.$queryRaw<LedgerExplain>(Prisma.sql`
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${revenueRetainedQuery()}`);
        throw rollback;
      }),
    ).rejects.toBe(rollback);
    const dir = resolve('../../e2e/.parity-out');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      resolve(dir, 'v46-802-retained-query-plan.json'),
      JSON.stringify(evidence, null, 2),
    );
    const root = evidence?.[0]?.['QUERY PLAN'][0]?.Plan;
    if (!root) throw new Error('Missing retained EXPLAIN');
    const nodes = planNodes(root);
    expect(nodes.some((n) => n['Relation Name'] === 'revenue_shares')).toBe(false);
    expect(nodes.filter((n) => n['Node Type'] === 'Seq Scan')).toEqual([]);
    expect(nodes.some((n) => n['Index Name'] === 'stats_daily_revenue_retained')).toBe(true);
  });
});
