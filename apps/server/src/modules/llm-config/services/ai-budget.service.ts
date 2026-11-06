import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/common/redis/redis.service';
import { AiCallRepository, type AiCallRecord } from '../repositories/ai-call.repository';

export function aiMonth(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  return `${parts.find((p) => p.type === 'year')?.value}-${parts.find((p) => p.type === 'month')?.value}`;
}
@Injectable()
export class AiBudgetService {
  private readonly logger = new Logger(AiBudgetService.name);
  constructor(
    private readonly calls: AiCallRepository,
    private readonly redis: RedisService,
  ) {}
  async spend(month = aiMonth()): Promise<number> {
    // Epoch fences reads started before a concurrently completed call.
    const key = `llm:spend:${month}`;
    let epoch: string | null = null;
    try {
      epoch = (await this.redis.client.get(`${key}:epoch`)) ?? '0';
      const value = await this.redis.client.get(key);
      if (value !== null && /^\d+$/.test(value) && Number.isSafeInteger(Number(value)))
        return Number(value);
    } catch {
      this.logger.warn('AI spend cache unavailable; reading durable usage');
    }
    const cost = await this.calls.cost(month);
    if (epoch !== null) {
      try {
        await this.redis.client.eval(
          "if (redis.call('GET',KEYS[1]) or '0')==ARGV[1] then return redis.call('SET',KEYS[2],ARGV[2],'EX',60) end return 0",
          2,
          `${key}:epoch`,
          key,
          epoch,
          String(cost),
        );
      } catch {
        this.logger.warn('AI spend cache fill unavailable; durable usage retained');
      }
    }
    return cost;
  }
  async record(row: AiCallRecord, log: boolean, month: string): Promise<void> {
    await this.calls.record(month, row, log);
    try {
      // Invalidate rather than SET a pre-commit snapshot, avoiding budget undercount races.
      await this.redis.client
        .multi()
        .incr(`llm:spend:${month}:epoch`)
        .del(`llm:spend:${month}`)
        .exec();
    } catch {
      this.logger.warn('AI spend invalidation unavailable; durable usage retained');
    }
  }
}
