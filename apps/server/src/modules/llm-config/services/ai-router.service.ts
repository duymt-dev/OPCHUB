import { Injectable } from '@nestjs/common';
import {
  IntegrationError,
  LocalLlmProvider,
  type LlmProvider,
  type LlmTurnContext,
  type LlmUsage,
} from '@opchub/integrations';
import { maskPii } from '@opchub/shared';
import type { AiProviderId, AiPurpose, AiSettings } from '@opchub/shared/api-domains';
import type { Prisma } from '@opchub/db';
import { RedisService } from '@/common/redis/redis.service';
import { AiConfigCache } from '../ai-config-cache';
import { AiBudgetService, aiMonth } from './ai-budget.service';
type Provider = Prisma.LlmProviderGetPayload<Record<string, never>>;
type Operation = (provider: LlmProvider) => Promise<string>;
const TAKE = `local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; return n`;
export const LLM_ROUTER = Symbol('LLM_ROUTER');
export interface LlmRouter {
  forPurpose(purpose: AiPurpose): LlmProvider;
}

@Injectable()
export class AiRouterService implements LlmRouter {
  constructor(
    private readonly cache: AiConfigCache,
    private readonly budget: AiBudgetService,
    private readonly redis: RedisService,
  ) {}
  forPurpose(purpose: AiPurpose): LlmProvider {
    return {
      name: 'admin-configured-llm',
      complete: (prompt, opts) => this.run(purpose, (p) => p.complete(prompt, opts)),
      generateTurn: (context: LlmTurnContext) => this.run(purpose, (p) => p.generateTurn(context)),
    };
  }
  private async run(purpose: AiPurpose, operation: Operation): Promise<string> {
    const { settings, providers } = await this.cache.snapshot();
    const selected = settings.use[purpose];
    if (!selected) throw this.error('Chức năng chưa chọn nhà cung cấp AI', 'not_configured');
    const usable = (id: string) =>
      providers.find((p) => p.id === id && p.enabled && p.baseUrl && p.model && this.cache.key(p));
    const month = aiMonth();
    const exhausted = settings.budget > 0 && (await this.budget.spend(month)) >= settings.budget;
    if (exhausted && purpose === 'bot') throw this.error('Hết ngân sách AI tháng');
    const fallback = usable(settings.fallback);
    const primary = exhausted ? fallback : (usable(selected) ?? fallback);
    if (!primary) throw this.error('Chưa cấu hình AI', 'not_configured');
    const count = Number(await this.redis.client.eval(TAKE, 1, 'llm:requests:minute'));
    if (count > 60)
      throw new IntegrationError('admin-configured-llm', 'AI request rate limit reached', true);
    try {
      return await this.attempt(
        primary,
        purpose,
        settings,
        operation,
        primary.id !== selected,
        month,
      );
    } catch (error) {
      if (
        !(error instanceof IntegrationError) ||
        !error.retryable ||
        !fallback ||
        primary.id === fallback.id
      )
        throw error;
      // A fallback is another physical request, not a way around the shared60/min ceiling.
      const fallbackCount = Number(await this.redis.client.eval(TAKE, 1, 'llm:requests:minute'));
      if (fallbackCount > 60)
        throw new IntegrationError('admin-configured-llm', 'AI request rate limit reached', true);
      return this.attempt(fallback, purpose, settings, operation, true, month);
    }
  }
  private async attempt(
    row: Provider,
    purpose: AiPurpose,
    settings: AiSettings,
    operation: Operation,
    fallback: boolean,
    month: string,
  ): Promise<string> {
    const key = this.cache.key(row);
    if (!key) throw this.error('Chưa cấu hình AI', 'not_configured');
    let usage: LlmUsage = { promptTokens: 0, completionTokens: 0 };
    const started = performance.now();
    const adapter = new LocalLlmProvider(
      {
        baseUrl: row.baseUrl,
        model: row.model,
        apiKey: key,
        maxTokens: settings.maxTokens,
        timeoutMs: settings.timeoutMs,
        temperature: settings.temperature,
        maxRequests: 1,
      },
      {
        ...(settings.pii ? { transform: maskPii } : {}),
        onUsage: (value) => {
          usage = value;
        },
      },
    );
    let response: string;
    try {
      response = await operation(adapter);
    } catch (error) {
      await this.record(
        row,
        purpose,
        settings,
        usage,
        started,
        'error',
        month,
        error instanceof IntegrationError && error.retryable ? 'RETRYABLE' : 'REJECTED',
      );
      throw error;
    }
    // Accounting errors are never treated as a provider failure / another billable retry.
    await this.record(
      row,
      purpose,
      settings,
      usage,
      started,
      fallback ? 'fallback' : 'ok',
      month,
      null,
    );
    return response;
  }
  private record(
    row: Provider,
    purpose: AiPurpose,
    settings: AiSettings,
    usage: LlmUsage,
    started: number,
    status: 'ok' | 'error' | 'fallback',
    month: string,
    errorCode: string | null,
  ) {
    return this.budget.record(
      {
        purpose,
        provider: row.id as AiProviderId,
        model: row.model,
        ...usage,
        cost: Math.round(
          (usage.promptTokens * row.priceIn + usage.completionTokens * row.priceOut) / 1e6,
        ),
        latencyMs: Math.round(performance.now() - started),
        status,
        errorCode,
      },
      settings.log,
      month,
    );
  }
  private error(message: string, reason?: 'not_configured') {
    return new IntegrationError(
      'admin-configured-llm',
      message,
      false,
      reason ? { reason } : undefined,
    );
  }
}
