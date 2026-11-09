import { Injectable } from '@nestjs/common';
import { Prisma } from '@opchub/db';
import type { AiPurpose, AiProviderId } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { AiCallItem, AiCallsQuery } from '@opchub/shared/api-domains';
import { aiCallPageQuery, aiCallTotalsQuery } from './ai-call-page.query';

type CallRow = Omit<AiCallItem, 'cost' | 'actor'> & {
  cost: bigint;
  actorRealm: 'member' | 'admin' | 'system';
  actorId: string | null;
};

export interface AiCallRecord {
  purpose: AiPurpose;
  provider: AiProviderId;
  model: string;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  latencyMs: number;
  status: 'ok' | 'error' | 'fallback';
  errorCode: string | null;
  actorRealm?: 'member' | 'admin' | 'system';
  actorId?: string | null;
}
export const purgeAiCallsQuery = (before: Date) => Prisma.sql`
  DELETE FROM llm_calls c USING (
    SELECT id FROM llm_calls WHERE created_at < ${before}
    ORDER BY created_at, id LIMIT 5000
  ) old WHERE c.id = old.id`;
export const aiUsageQuery = (month: string, r: AiCallRecord) => Prisma.sql`
  INSERT INTO llm_usage_months (month, cost, prompt_tokens, completion_tokens, calls)
  VALUES (${month}, ${r.cost}, ${r.promptTokens}, ${r.completionTokens}, 1)
  ON CONFLICT (month) DO UPDATE SET cost = llm_usage_months.cost + EXCLUDED.cost,
    prompt_tokens = llm_usage_months.prompt_tokens + EXCLUDED.prompt_tokens,
    completion_tokens = llm_usage_months.completion_tokens + EXCLUDED.completion_tokens,
    calls = llm_usage_months.calls + 1`;
@Injectable()
export class AiCallRepository {
  constructor(private readonly prisma: PrismaService) {}
  page(query: AiCallsQuery, size = query.limit + 1) {
    return this.prisma.db.$queryRaw<CallRow[]>(aiCallPageQuery(query, size));
  }
  async totals(query: AiCallsQuery) {
    const [row] = await this.prisma.db.$queryRaw<
      {
        calls: bigint;
        cost: bigint;
        promptTokens: bigint;
        completionTokens: bigint;
      }[]
    >(aiCallTotalsQuery(query));
    return Object.fromEntries(
      Object.entries(row ?? {}).map(([key, value]) => [key, Number(value)]),
    );
  }
  async record(month: string, row: AiCallRecord, log: boolean): Promise<void> {
    await this.prisma.db.$transaction(async (tx) => {
      await tx.$executeRaw(aiUsageQuery(month, row));
      if (log) await tx.llmCall.create({ data: row });
    });
  }
  async cost(month: string): Promise<number> {
    const row = await this.prisma.db.llmUsageMonth.findUnique({
      where: { month },
      select: { cost: true },
    });
    const cost = Number(row?.cost ?? 0);
    if (!Number.isSafeInteger(cost)) throw new Error('AI spend exceeds safe integer range');
    return cost;
  }
  async purge(now: Date): Promise<number> {
    const before = new Date(now.getTime() - 90 * 86400000);
    let total = 0;
    let batch: number;
    do {
      batch = await this.prisma.db.$executeRaw(purgeAiCallsQuery(before));
      total += batch;
    } while (batch === 5000);
    return total;
  }
}
