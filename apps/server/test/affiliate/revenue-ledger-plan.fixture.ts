import type { DbTx } from '@opchub/db';

export async function seedLedgerPlan(tx: DbTx, prefix: string) {
  await tx.$executeRaw`
    INSERT INTO revenue_shares (id, source, source_id, plan, customer_id, affiliate_id, region,
      director_id, director_name, received_at, recorded_at, first_received_at, customer_year,
      amount, year_one_rate, annual_decrease, minimum_rate, director_rate,
      director_amount, media_soft_amount, month_key)
    SELECT gen_random_uuid()::text, 'membership', ${prefix} || n::text, 'personal',
      ${prefix} || n::text, 'explain-affiliate', 'north', ${prefix} || (n % 100)::text,
      'EXPLAIN Director', '2026-09-10'::timestamptz + n * interval '1 second',
      '2026-09-11', '2026-09-10', 1, 101, 50, 10, 20, 50, 51, 50,
      '2026-' || lpad((1 + (n / 100) % 9)::text, 2, '0')
    FROM generate_series(1, 10000) n`;
  await tx.$executeRaw`ANALYZE revenue_shares`;
  await tx.$executeRaw`INSERT INTO revenue_recipient_banks (director_id)
    SELECT ${prefix} || n::text FROM generate_series(1, 10000) n`;
  await tx.$executeRaw`ANALYZE revenue_recipient_banks`;
}

export type PlanNode = {
  'Node Type': string;
  'Relation Name'?: string;
  'Index Name'?: string;
  Plans?: PlanNode[];
};
export type LedgerExplain = { 'QUERY PLAN': { Plan: PlanNode; 'Execution Time': number }[] }[];
export function planNodes(plan: PlanNode): PlanNode[] {
  return [plan, ...(plan.Plans ?? []).flatMap(planNodes)];
}
