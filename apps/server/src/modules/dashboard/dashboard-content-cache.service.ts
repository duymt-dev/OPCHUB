import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { RedisService } from '@/common/redis/redis.service';

const epochKey = 'dashboard:content:epoch';
const keys = { blocks: 'dashboard:blocks', threads: 'dashboard:threads' } as const;
const putIfCurrent = `if (redis.call('GET', KEYS[1]) or '0') ~= ARGV[1] then return 0 end
  redis.call('SET', KEYS[2], ARGV[2], 'EX', ARGV[3]); return 1`;
const invalidate = `local n = redis.call('INCR', KEYS[1]);
  redis.call('DEL', KEYS[2], KEYS[3]); return n`;

/** Public Dashboard port. Epoch/CAS prevents a pre-hide reader from repopulating stale content. */
@Injectable()
export class DashboardContentCacheService {
  constructor(private readonly redis: RedisService) {}

  async invalidate(): Promise<void> {
    await this.redis.client.eval(invalidate, 3, epochKey, keys.blocks, keys.threads);
  }

  async remember<T>(
    part: keyof typeof keys,
    ttl: number,
    schema: z.ZodType<T>,
    compute: () => Promise<T>,
  ): Promise<T> {
    const epoch = (await this.redis.client.get(epochKey)) ?? '0';
    const raw = await this.redis.client.get(keys[part]);
    if (raw) {
      const parsed = z.object({ epoch: z.string(), data: schema }).safeParse(this.json(raw));
      if (parsed.success && parsed.data.epoch === epoch) return parsed.data.data;
    }
    const data = await compute();
    const stored = await this.redis.client.eval(
      putIfCurrent,
      2,
      epochKey,
      keys[part],
      epoch,
      JSON.stringify({ epoch, data }),
      ttl,
    );
    // One fresh uncached read on an invalidation race, never an unbounded DB retry loop.
    return Number(stored) === 1 ? data : compute();
  }

  private json(raw: string): unknown {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
}
