import { Injectable } from '@nestjs/common';
import { AppError } from '@/common/errors';
import { RedisService } from '@/common/redis/redis.service';

// One atomic check for both windows: rejecting the global budget must not spend a group slot.
const RESERVE = `
for i, key in ipairs(KEYS) do
  redis.call('ZREMRANGEBYSCORE', key, '-inf', tonumber(ARGV[1]) - 60000)
  local limit = i == 1 and 12 or 60
  if not redis.call('ZSCORE', key, ARGV[2]) and redis.call('ZCARD', key) >= limit then return 0 end
end
for _, key in ipairs(KEYS) do
  if not redis.call('ZSCORE', key, ARGV[2]) then redis.call('ZADD', key, ARGV[1], ARGV[2]) end
  redis.call('EXPIRE', key, 120)
end
return 1`;

@Injectable()
export class BotReplyLimitsService {
  constructor(private readonly redis: RedisService) {}

  async reserve(groupId: string, publicationId: string, now: Date): Promise<void> {
    const keys = this.keys(groupId);
    const result = await this.redis.client.eval(
      RESERVE,
      keys.length,
      ...keys,
      now.getTime(),
      publicationId,
    );
    if (Number(result) !== 1)
      throw new AppError(
        'RATE_LIMITED',
        'Đã đạt giới hạn phản hồi 12 tin/nhóm hoặc 60 tin hệ thống/phút',
        undefined,
        60,
      );
  }

  async release(groupId: string, publicationId: string): Promise<void> {
    const pipe = this.redis.client.pipeline();
    for (const key of this.keys(groupId)) pipe.zrem(key, publicationId);
    await pipe.exec();
  }

  private keys(groupId: string) {
    return [`bot:reply-rate:group:${groupId}`, 'bot:reply-rate:system'];
  }
}
