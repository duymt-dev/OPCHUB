import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Prisma, createPrismaClient, type DbClient } from '@opchub/db';
import { loadEnv } from '@/common/config';
import {
  aiUsageQuery,
  purgeAiCallsQuery,
} from '@/modules/llm-config/repositories/ai-call.repository';
describe('REQ-628 actual indexed call retention and monthly upsert on10k rows', () => {
  let db: DbClient;
  beforeAll(() => {
    db = createPrismaClient(loadEnv().DATABASE_URL, { max: 1 });
  });
  afterAll(() => db.$disconnect());
  it('bounded5000 retention uses created_at/id index; month upsert uses conflict PK', async () => {
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`CREATE TEMP TABLE llm_calls (LIKE public.llm_calls INCLUDING ALL) ON COMMIT DROP`;
      await tx.$executeRaw`CREATE TEMP TABLE llm_usage_months (LIKE public.llm_usage_months INCLUDING ALL) ON COMMIT DROP`;
      await tx.$executeRaw`INSERT INTO pg_temp.llm_calls(id,created_at,purpose,provider,model,latency_ms,status) SELECT n::text,'2040-01-01'::timestamptz+n*interval '1 day','bot','custom','plan',1,'ok' FROM generate_series(1,10000) n`;
      await tx.$executeRaw`INSERT INTO pg_temp.llm_usage_months(month) SELECT to_char('1700-01-01'::date+n*interval '1 month','YYYY-MM') FROM generate_series(1,10000) n`;
      await tx.$executeRaw`ANALYZE pg_temp.llm_calls`;
      await tx.$executeRaw`ANALYZE pg_temp.llm_usage_months`;
      const purge = await tx.$queryRaw<{ 'QUERY PLAN': string }[]>(
        Prisma.sql`EXPLAIN (ANALYZE,BUFFERS) ${purgeAiCallsQuery(new Date('2040-01-20T00:00:00Z'))}`,
      );
      const text = purge.map((r) => r['QUERY PLAN']).join('\n');
      process.stdout.write(`AI retention plan:\n${text}\n`);
      expect(text).toMatch(/Index (Only )?Scan/);
      expect(text).not.toMatch(/Seq Scan/);
      expect(text).toContain('created_at');
      const usage = await tx.$queryRaw<{ 'QUERY PLAN': string }[]>(
        Prisma.sql`EXPLAIN (ANALYZE,BUFFERS) ${aiUsageQuery('2040-01', { purpose: 'bot', provider: 'custom', model: 'plan', promptTokens: 1000, completionTokens: 500, cost: 25, latencyMs: 1, status: 'ok', errorCode: null })}`,
      );
      const upsert = usage.map((r) => r['QUERY PLAN']).join('\n');
      process.stdout.write(`AI usage plan:\n${upsert}\n`);
      expect(upsert).toContain('Conflict Arbiter Indexes:');
      expect(upsert).not.toMatch(/Seq Scan/);
      expect(
        (
          await tx.$queryRaw<
            { cost: bigint }[]
          >`SELECT cost FROM pg_temp.llm_usage_months WHERE month='2040-01'`
        )[0]?.cost,
      ).toBe(25n);
    });
  });
});
