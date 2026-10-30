import { z } from 'zod';
import type { Prisma } from '@opchub/db';
import type { TestApp } from '../setup/test-app';

const nodeSchema = z.object({
  'Node Type': z.string(),
  'Relation Name': z.string().optional(),
  'Index Name': z.string().optional(),
  'Actual Rows': z.number(),
  'Actual Loops': z.number(),
  'Actual Total Time': z.number(),
  'Shared Hit Blocks': z.number(),
  'Shared Read Blocks': z.number(),
  'Heap Fetches': z.number().optional(),
});
const planSchema = z
  .array(
    z.object({
      Plan: z.record(z.string(), z.unknown()),
      'Planning Time': z.number(),
      'Execution Time': z.number(),
    }),
  )
  .length(1);

/** JSON EXPLAIN contains actual fixture data only; never print bindings or application secrets. */
export async function directorPlanEvidence(t: TestApp, name: string, query: Prisma.Sql) {
  const result = await t.prisma.db.$queryRaw<{ 'QUERY PLAN': unknown }[]>`
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
  const [plan] = planSchema.parse(result[0]?.['QUERY PLAN']);
  if (!plan) throw new Error('Missing EXPLAIN plan');
  const nodes: z.infer<typeof nodeSchema>[] = [];
  const visit = (item: unknown) => {
    if (!item || typeof item !== 'object') return;
    const row = item as Record<string, unknown>;
    if (typeof row['Node Type'] === 'string') nodes.push(nodeSchema.parse(row));
    Object.values(row).forEach(visit);
  };
  visit(plan.Plan);
  const evidence = {
    name,
    planningMs: plan['Planning Time'],
    executionMs: plan['Execution Time'],
    nodes,
  };
  process.stdout.write(`REQ-616 EXPLAIN_METRICS ${JSON.stringify(evidence)}\n`);
  return nodes.map((node) => ({
    type: node['Node Type'],
    relation: node['Relation Name'] ?? '',
    index: node['Index Name'] ?? '',
  }));
}
