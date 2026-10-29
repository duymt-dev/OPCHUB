import { Injectable } from '@nestjs/common';
import {
  IntegrationError,
  LocalLlmProvider,
  type LlmProvider,
  type LlmTurnContext,
} from '@opchub/integrations';
import { RedisService } from '@/common/redis/redis.service';
import { LlmConfigCache } from './llm-config-cache';

const TAKE = `local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('EXPIRE', KEYS[1], 60) end
return n`;

/** ADR-0008: unconfigured/disabled runtime never generates a fake fallback reply. */
@Injectable()
export class LlmRuntimeService implements LlmProvider {
  readonly name = 'admin-configured-llm';
  constructor(
    private readonly cache: LlmConfigCache,
    private readonly redis: RedisService,
  ) {}

  async complete(prompt: string, opts?: { maxTokens?: number }): Promise<string> {
    return (await this.provider()).complete(prompt, opts);
  }

  async generateTurn(context: LlmTurnContext): Promise<string> {
    return (await this.provider()).generateTurn(context);
  }

  private async provider(): Promise<LlmProvider> {
    const row = await this.cache.row();
    const key = row?.enabled ? this.cache.key(row) : null;
    if (!row?.enabled || !row.baseUrl || !row.model || !key)
      throw new IntegrationError(this.name, 'Chưa cấu hình AI', false);
    const count = Number(await this.redis.client.eval(TAKE, 1, 'llm:requests:minute'));
    if (count > 60) throw new IntegrationError(this.name, 'AI request rate limit reached', true);
    // One network request per operation. Redis enforces a shared bounded window; no lifetime cap.
    return new LocalLlmProvider({
      baseUrl: row.baseUrl,
      model: row.model,
      apiKey: key,
      maxTokens: row.maxTokens,
      timeoutMs: row.timeoutMs,
      maxRequests: 1,
    });
  }
}
