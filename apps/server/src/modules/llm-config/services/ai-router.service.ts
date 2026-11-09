import { Injectable } from '@nestjs/common';
import {
  IntegrationError,
  LocalLlmProvider,
  type LlmProvider,
  type LlmUsage,
} from '@opchub/integrations';
import { maskPii } from '@opchub/shared';
import type { AiProviderId, AiPurpose, AiSettings } from '@opchub/shared/api-domains';
import type { Prisma } from '@opchub/db';
import { RedisService } from '@/common/redis/redis.service';
import { AiConfigCache } from '../ai-config-cache';
import { AiBudgetService, aiMonth } from './ai-budget.service';
import { AiReservationService } from './ai-reservation.service';
import { AiBudgetAlertService } from './ai-budget-alert.service';

type Provider = Prisma.LlmProviderGetPayload<Record<string, never>>;
type Operation = (provider: LlmProvider) => Promise<string>;
const TAKE = `local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; return n`;
export const LLM_ROUTER = Symbol('LLM_ROUTER');
export interface AiCallContext {
  actor?: { realm: 'member' | 'admin' | 'system'; id?: string };
  validateOutput?: (value: string) => boolean;
}
export interface LlmRouter {
  forPurpose(purpose: AiPurpose, context?: AiCallContext): LlmProvider;
}

@Injectable()
export class AiRouterService implements LlmRouter {
  constructor(
    private readonly cache: AiConfigCache,
    private readonly budget: AiBudgetService,
    private readonly redis: RedisService,
    private readonly reservations: AiReservationService,
    private readonly alerts: AiBudgetAlertService,
  ) {}
  forPurpose(purpose: AiPurpose, context: AiCallContext = {}): LlmProvider {
    return {
      name: 'admin-configured-llm',
      complete: (prompt, opts) =>
        this.run(purpose, (p) => p.complete(prompt, opts), prompt.length, opts?.maxTokens, context),
      // Adapter's fixed system prompt plus role framing is bounded by 512 chars.
      generateTurn: (turn) =>
        this.run(
          purpose,
          (p) => p.generateTurn(turn),
          JSON.stringify(turn).length + 512,
          undefined,
          context,
        ),
    };
  }
  private async run(
    purpose: AiPurpose,
    operation: Operation,
    chars: number,
    maxTokens: number | undefined,
    context: AiCallContext,
  ): Promise<string> {
    const { settings, providers } = await this.cache.snapshot();
    const selected = settings.use[purpose];
    if (!selected) throw this.error('Chức năng chưa chọn nhà cung cấp AI', 'not_configured');
    const usable = (id: string) =>
      providers.find((p) => p.id === id && p.enabled && p.baseUrl && p.model && this.cache.key(p));
    const fallback = usable(settings.fallback);
    const primary = usable(selected) ?? fallback;
    if (!primary) throw this.error('Chưa cấu hình AI', 'not_configured');
    const month = aiMonth();
    const invoke = (row: Provider) =>
      this.attempt(
        row,
        purpose,
        settings,
        operation,
        row.id !== selected,
        month,
        chars,
        maxTokens,
        context,
      );
    try {
      return await invoke(primary);
    } catch (error) {
      const budgetDenied = error instanceof IntegrationError && error.reason === 'budget_exhausted';
      if (
        !(error instanceof IntegrationError) ||
        // Moderation gets at most one physical request per message. A budget refusal
        // precedes HTTP, so it may still select the fallback without a second call.
        (purpose === 'mod' && !budgetDenied) ||
        (!error.retryable && !(budgetDenied && purpose !== 'bot')) ||
        !fallback ||
        primary.id === fallback.id
      )
        throw error;
      return invoke(fallback);
    }
  }
  private async attempt(
    row: Provider,
    purpose: AiPurpose,
    settings: AiSettings,
    operation: Operation,
    fallback: boolean,
    month: string,
    chars: number,
    requestedTokens: number | undefined,
    context: AiCallContext,
  ): Promise<string> {
    const key = this.cache.key(row);
    if (!key) throw this.error('Chưa cấu hình AI', 'not_configured');
    const estimate = Math.ceil(
      (Math.ceil(chars / 3) * row.priceIn +
        Math.min(requestedTokens ?? settings.maxTokens, settings.maxTokens) * row.priceOut) /
        1e6,
    );
    const lease = await this.reservations.take(month, estimate, settings.budget);
    if (!lease) {
      await this.alerts.check(month, settings, true);
      throw this.error('Hết ngân sách AI tháng', 'budget_exhausted');
    }
    const model = !fallback ? (settings.models?.[purpose] ?? row.model) : row.model;
    let usage: LlmUsage = { promptTokens: 0, completionTokens: 0 };
    const started = performance.now();
    let accounted = true;
    try {
      const count = Number(await this.redis.client.eval(TAKE, 1, 'llm:requests:minute'));
      if (count > 60)
        throw new IntegrationError('admin-configured-llm', 'AI request rate limit reached', false);
      const adapter = this.adapter(row, key, model, settings, (value) => {
        usage = value;
      });
      let response: string;
      let failure: unknown;
      accounted = false;
      try {
        response = await operation(adapter);
        if (context.validateOutput && !context.validateOutput(response))
          throw this.error('Invalid AI output', 'invalid_output');
      } catch (error) {
        failure = error;
        response = '';
      }
      // Never retry a paid request because accounting/alert publication failed.
      await this.budget.record(
        {
          purpose,
          provider: row.id as AiProviderId,
          model,
          ...usage,
          cost: Math.round(
            (usage.promptTokens * row.priceIn + usage.completionTokens * row.priceOut) / 1e6,
          ),
          latencyMs: Math.round(performance.now() - started),
          status: failure ? 'error' : fallback ? 'fallback' : 'ok',
          errorCode:
            failure instanceof IntegrationError && failure.reason === 'invalid_output'
              ? 'invalid_output'
              : failure
                ? failure instanceof IntegrationError && failure.retryable
                  ? 'RETRYABLE'
                  : 'REJECTED'
                : null,
          actorRealm: context.actor?.realm ?? 'system',
          actorId: context.actor?.id ?? null,
        },
        settings.log,
        month,
      );
      accounted = true;
      await this.alerts.check(month, settings);
      if (failure) throw failure instanceof Error ? failure : Error('AI provider request failed');
      return response;
    } finally {
      // A durable accounting failure keeps the lease until TTL (fail closed).
      if (accounted) await this.reservations.release(lease);
    }
  }
  private error(message: string, reason: NonNullable<IntegrationError['reason']>) {
    return new IntegrationError('admin-configured-llm', message, false, { reason });
  }
  private adapter(
    row: Provider,
    apiKey: string,
    model: string,
    settings: AiSettings,
    onUsage: (value: LlmUsage) => void,
  ) {
    return new LocalLlmProvider(
      {
        baseUrl: row.baseUrl,
        model,
        apiKey,
        maxTokens: settings.maxTokens,
        timeoutMs: settings.timeoutMs,
        temperature: settings.temperature,
        maxRequests: 1,
      },
      { ...(settings.pii ? { transform: maskPii } : {}), onUsage },
    );
  }
}
