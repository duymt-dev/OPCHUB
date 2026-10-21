import { Injectable } from '@nestjs/common';
import { RedisService } from '@/common/redis/redis.service';

export const replyCooldownKey = (roomId: string) => `bot:reply-cooldown:${roomId}`;
const COOLDOWN_MS = 120_000;

/** Redis accelerates the gate; durable admission/post timestamps survive cache loss. */
@Injectable()
export class BotReplyCooldownService {
  constructor(private readonly redis: RedisService) {}

  async available(roomId: string, latest: Date | null, now: Date): Promise<boolean> {
    const cached = Number(await this.redis.client.get(replyCooldownKey(roomId))) || 0;
    const until = Math.max(cached, latest ? latest.getTime() + COOLDOWN_MS : 0);
    if (until <= now.getTime()) return true;
    await this.redis.client.set(
      replyCooldownKey(roomId),
      until,
      'EX',
      Math.max(1, Math.ceil((until - now.getTime()) / 1000)),
    );
    return false;
  }

  record(roomId: string, admittedAt: Date) {
    return this.redis.client.set(
      replyCooldownKey(roomId),
      admittedAt.getTime() + COOLDOWN_MS,
      'EX',
      120,
    );
  }
}
