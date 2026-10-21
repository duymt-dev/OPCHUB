import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { AppError } from '@/common/errors';
import { RedisService } from '@/common/redis/redis.service';
import { botDayStart } from '../domain/active-hours';

const RESERVE = `
for _, key in ipairs(KEYS) do
  redis.call('ZREMRANGEBYSCORE', key, '-inf', tonumber(ARGV[1]) - 60000)
  if not redis.call('ZSCORE', key, ARGV[2]) and redis.call('ZCARD', key) >= 30 then return 0 end
end
for _, key in ipairs(KEYS) do
  redis.call('ZADD', key, ARGV[1], ARGV[2]); redis.call('EXPIRE', key, 120)
end
return 1`;

@Injectable()
export class BotTurnLimitsService {
  constructor(private readonly redis: RedisService) {}

  async daily(
    tx: DbTx,
    personaId: string,
    maximum: number,
    needed: number,
    now: Date,
  ): Promise<boolean> {
    const start = botDayStart(now);
    const rows = await tx.$queryRaw<{ n: bigint }[]>`
      SELECT count(*) AS n FROM messages WHERE persona_id = ${personaId} AND is_simulated
        AND created_at >= ${start} AND created_at < ${new Date(start.getTime() + 86400000)}`;
    const count = Number(rows[0]?.n ?? 0);
    // Persona row is locked by caller. Rebuild Redis from durable rows after a crash/rollback.
    await this.redis.client.set(
      `bot:day:${personaId}:${start.toISOString()}`,
      count + needed <= maximum ? count + needed : count,
      'EX',
      172800,
    );
    return count + needed <= maximum;
  }

  async reserve(groups: string[], key: string, now: Date): Promise<void> {
    if (!groups.length) return;
    const keys = groups.map((group) => `chat:bot-rate:${group}`);
    const result = await this.redis.client.eval(RESERVE, keys.length, ...keys, now.getTime(), key);
    if (Number(result) !== 1)
      throw new AppError('RATE_LIMITED', 'Nhóm đã đạt giới hạn 30 tin tự động/phút');
  }

  async release(groups: string[], key: string): Promise<void> {
    const pipe = this.redis.client.pipeline();
    for (const group of groups) pipe.zrem(`chat:bot-rate:${group}`, key);
    await pipe.exec();
  }
}
