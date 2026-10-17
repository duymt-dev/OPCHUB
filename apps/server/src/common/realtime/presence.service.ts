import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

/** Socket hết hạn nếu process chết mà không dọn (heartbeat làm mới mỗi lần đếm) */
const STALE_MS = 90_000;
const key = (roomId: string) => `presence:room:${roomId}`;
/** Phòng có thay đổi chờ phát — dùng chung giữa các process socket (SET) */
const DIRTY = 'presence:dirty';

/**
 * Presence (S-01): ZSET `presence:room:{id}` (member = socketId, score = hạn). Chỉ phát **số** online,
 * gom mỗi ≤ 5 giây theo tập phòng "bẩn" — không phát sự kiện vào/ra từng người.
 */
@Injectable()
export class PresenceService implements OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly redis: RedisService) {}

  async enter(roomId: string, socketId: string): Promise<number> {
    const now = Date.now();
    const r = await this.redis.client
      .multi()
      .zremrangebyscore(key(roomId), 0, now)
      .zadd(key(roomId), now + STALE_MS, socketId)
      .pexpire(key(roomId), STALE_MS)
      .zcard(key(roomId))
      .sadd(DIRTY, roomId)
      .exec();
    const card = r?.[3]?.[1];
    return typeof card === 'number' ? card : 0;
  }

  async leave(roomIds: readonly string[], socketId: string): Promise<void> {
    if (!roomIds.length) return;
    const p = this.redis.client.pipeline();
    for (const id of roomIds) p.zrem(key(id), socketId);
    p.sadd(DIRTY, ...roomIds);
    await p.exec();
  }

  /** Gia hạn presence của các socket cục bộ `[socketId, roomIds]` — 1 pipeline */
  async touchMany(entries: readonly [string, readonly string[]][]): Promise<void> {
    if (!entries.length) return;
    const until = Date.now() + STALE_MS;
    const p = this.redis.client.pipeline();
    for (const [socketId, roomIds] of entries) {
      for (const id of roomIds) {
        p.zadd(key(id), until, socketId);
        p.pexpire(key(id), STALE_MS);
      }
    }
    await p.exec();
  }

  /** Số online của nhiều phòng — 1 pipeline (dùng cho `/me/chat`, B23) */
  async counts(roomIds: readonly string[]): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    if (!roomIds.length) return out;
    const now = Date.now();
    const p = this.redis.client.pipeline();
    for (const id of roomIds) p.zcount(key(id), now, '+inf');
    const res = (await p.exec()) ?? [];
    roomIds.forEach((id, i) => {
      const v = res[i]?.[1];
      out.set(id, typeof v === 'number' ? v : 0);
    });
    return out;
  }

  /** Lấy và xoá tập phòng bẩn (SPOP nguyên tử giữa các process) */
  async drainDirty(max = 500): Promise<string[]> {
    return this.redis.client.spop(DIRTY, max);
  }

  /** Chạy `flush` mỗi `everyMs` (≤ 5s, S-01) */
  startTicker(everyMs: number, flush: () => Promise<void>): void {
    this.timer = setInterval(() => {
      void flush().catch(() => undefined);
    }, everyMs);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
