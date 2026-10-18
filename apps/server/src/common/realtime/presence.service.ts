import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

/** Socket hết hạn nếu process chết mà không dọn (heartbeat làm mới mỗi lần đếm) */
const STALE_MS = 90_000;
const key = (roomId: string) => `presence:room:${roomId}`;
/** Người đang có ≥ 1 socket: ZSET `presence:users` (member = userId, score = hạn) */
const USERS = 'presence:users';
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

  /** Đánh dấu user online (kết nối / heartbeat) — 1 lệnh cho cả lô */
  async usersSeen(userIds: readonly string[]): Promise<void> {
    if (!userIds.length) return;
    const until = Date.now() + STALE_MS;
    await this.redis.client.zadd(USERS, ...userIds.flatMap((id) => [until, id]));
  }

  /** Bỏ user khỏi danh sách online ngay (TK bị khoá — NA-16); heartbeat sau ngắt không thêm lại */
  async forgetUsers(userIds: readonly string[]): Promise<void> {
    if (!userIds.length) return;
    await this.redis.client.zrem(USERS, ...userIds);
  }

  /** Số user đang online toàn hệ thống (dashboard) — ZCOUNT theo hạn, O(log n) */
  onlineCount(): Promise<number> {
    return this.redis.client.zcount(USERS, Date.now(), '+inf');
  }

  /** User trong danh sách đang online (panel thành viên) — 1 pipeline ZSCORE */
  async usersOnline(userIds: readonly string[]): Promise<Set<string>> {
    const out = new Set<string>();
    if (!userIds.length) return out;
    const scores = await this.redis.client.zmscore(USERS, ...userIds);
    const now = Date.now();
    userIds.forEach((id, i) => {
      if (Number(scores[i] ?? 0) > now) out.add(id);
    });
    return out;
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
