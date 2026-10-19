import { Injectable } from '@nestjs/common';
import { LIVE_FEED_MAX, type LiveActivity, liveActivitySchema } from '@opchub/shared/api-domains';
import { RedisService } from '../redis/redis.service';

/** Khoá dưới `dashboard:` để `flush:dev-cache` dọn cùng cache Dashboard */
const FEED = 'dashboard:feed';
const MSG_MIN = 'dashboard:msgs:min';
const JOIN_MIN = 'dashboard:joins:min';
const dayKey = (day: string) => `dashboard:msgs:day:${day}`;
const WINDOW_MS = 60_000;
const DAY_TTL_SEC = 2 * 86_400;
const VN_OFFSET_MS = 7 * 3_600_000;

/** Ngày VN (YYYY-MM-DD) của một thời điểm */
export const vnDay = (at: Date) => new Date(at.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);

export interface LiveActor {
  name: string;
  avatarUrl: string | null;
}

export interface CounterSnapshot {
  /** null = chưa có bộ đếm hôm nay (Redis mất) → nơi gọi dựng lại từ DB một lần */
  messagesToday: number | null;
  messagesLastMinute: number;
  joinsLastMinute: number;
  activities: LiveActivity[];
}

/**
 * NA-24 (S-10): bộ đếm Redis cho Dashboard — mỗi sự kiện 1 pipeline, đọc snapshot 1 pipeline
 * (không query DB mỗi nhịp 3 giây). Hoạt động trực tiếp: LIST `LPUSH` + `LTRIM 0 49`, chỉ lưu tên
 * hiển thị, avatar, loại, đích (nhóm / sự kiện), thời điểm — không lưu nội dung tin.
 */
@Injectable()
export class LiveCountersService {
  constructor(private readonly redis: RedisService) {}

  async record(
    kind: LiveActivity['kind'],
    actor: LiveActor,
    target: string,
    id: string,
    at = new Date(),
  ): Promise<void> {
    const item: LiveActivity = {
      id: `${kind}:${id}`,
      memberName: actor.name,
      avatarUrl: actor.avatarUrl,
      kind,
      target,
      at: at.toISOString(),
    };
    const ms = at.getTime();
    const p = this.redis.client.pipeline();
    p.lpush(FEED, JSON.stringify(item)).ltrim(FEED, 0, LIVE_FEED_MAX - 1);
    if (kind === 'msg') {
      p.incr(dayKey(vnDay(at))).expire(dayKey(vnDay(at)), DAY_TTL_SEC);
      p.zadd(MSG_MIN, ms, item.id).zremrangebyscore(MSG_MIN, 0, ms - WINDOW_MS);
    }
    if (kind === 'join') {
      p.zadd(JOIN_MIN, ms, item.id).zremrangebyscore(JOIN_MIN, 0, ms - WINDOW_MS);
    }
    await p.exec();
  }

  /** Dựng lại bộ đếm tin hôm nay (miss) — NX để không đè số đang tăng */
  async seedMessagesToday(now: Date, count: number): Promise<void> {
    await this.redis.client.set(dayKey(vnDay(now)), String(count), 'EX', DAY_TTL_SEC, 'NX');
  }

  async snapshot(now = new Date()): Promise<CounterSnapshot> {
    const from = now.getTime() - WINDOW_MS;
    const r = await this.redis.client
      .pipeline()
      .get(dayKey(vnDay(now)))
      .zcount(MSG_MIN, from, '+inf')
      .zcount(JOIN_MIN, from, '+inf')
      .lrange(FEED, 0, LIVE_FEED_MAX - 1)
      .exec();
    const val = (i: number): unknown => r?.[i]?.[1];
    const today = val(0);
    const raw = val(3);
    const activities = (Array.isArray(raw) ? raw : []).flatMap((s: unknown) => {
      const p = typeof s === 'string' ? liveActivitySchema.safeParse(JSON.parse(s)) : null;
      return p?.success ? [p.data] : [];
    });
    return {
      messagesToday: typeof today === 'string' ? Number(today) : null,
      messagesLastMinute: Number(val(1) ?? 0),
      joinsLastMinute: Number(val(2) ?? 0),
      activities,
    };
  }
}
