import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { IntegrationError } from '@opchub/integrations';
import { RedisService } from '@/common/redis/redis.service';
import { AiBudgetService } from './ai-budget.service';

// The epoch fences a spend snapshot taken before another call settled. Keep the
// reservation until durable accounting AND cache invalidation have completed.
const RESERVE = `
local reserved = tonumber(redis.call('GET',KEYS[1]) or '0')
local estimate = tonumber(ARGV[3])
if estimate > 0 and tonumber(ARGV[4]) > 0 and
  (redis.call('GET',KEYS[3]) or '0') ~= ARGV[1] then return -2 end
if tonumber(ARGV[4]) > 0 and estimate > 0 and
  tonumber(ARGV[2]) + reserved + estimate > tonumber(ARGV[4]) then return -1 end
redis.call('INCRBY',KEYS[1],ARGV[3])
redis.call('HSET',KEYS[2],ARGV[5],ARGV[3])
redis.call('EXPIRE',KEYS[1],900)
redis.call('EXPIRE',KEYS[2],900)
return 1`;
const RELEASE = `
local amount = redis.call('HGET',KEYS[2],ARGV[1])
if not amount then return 0 end
if tonumber(amount) > 0 then
  redis.call('INCR',KEYS[3])
  redis.call('DEL',KEYS[4])
end
redis.call('HDEL',KEYS[2],ARGV[1])
local value = math.max(0,tonumber(redis.call('GET',KEYS[1]) or '0')-tonumber(amount))
redis.call('SET',KEYS[1],value,'KEEPTTL')
return value`;

export interface AiReservation {
  month: string;
  token: string;
}

@Injectable()
export class AiReservationService {
  private readonly logger = new Logger(AiReservationService.name);
  constructor(
    private readonly redis: RedisService,
    private readonly budget: AiBudgetService,
  ) {}

  async take(month: string, estimate: number, limit: number): Promise<AiReservation | null> {
    if (!Number.isSafeInteger(estimate) || estimate < 0) throw Error('Invalid AI estimate');
    const token = randomUUID();
    try {
      // Retry only a bounded accounting fence conflict; no unbounded polling.
      return await this.tryTake(month, token, estimate, limit, 0);
    } catch {
      this.logger.warn('AI reservation unavailable; request not sent');
      throw new IntegrationError(
        'admin-configured-llm',
        'AI budget reservation unavailable',
        false,
      );
    }
  }
  private async tryTake(
    month: string,
    token: string,
    estimate: number,
    limit: number,
    retry: number,
  ): Promise<AiReservation | null> {
    const epochKey = `llm:spend:${month}:epoch`;
    const epoch = (await this.redis.client.get(epochKey)) ?? '0';
    const spend = await this.budget.spend(month);
    const result = Number(
      await this.redis.client.eval(
        RESERVE,
        3,
        `llm:reserved:${month}`,
        `llm:reservations:${month}`,
        epochKey,
        epoch,
        spend,
        estimate,
        limit,
        token,
      ),
    );
    if (result === -2) {
      if (retry >= 3) throw Error('AI accounting changed during reservation');
      return this.tryTake(month, token, estimate, limit, retry + 1);
    }
    return result === 1 ? { month, token } : null;
  }
  async release(lease: AiReservation): Promise<void> {
    try {
      await this.redis.client.eval(
        RELEASE,
        4,
        `llm:reserved:${lease.month}`,
        `llm:reservations:${lease.month}`,
        `llm:spend:${lease.month}:epoch`,
        `llm:spend:${lease.month}`,
        lease.token,
      );
    } catch {
      // Fail conservatively: a leaked lease expires, never permits extra paid calls.
      this.logger.warn('AI reservation release unavailable; lease retained until expiry');
    }
  }
}
