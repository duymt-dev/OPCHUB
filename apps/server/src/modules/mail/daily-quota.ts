import { Injectable } from '@nestjs/common';
import { RedisService } from '@/common/redis/redis.service';

const VN_OFFSET_MS = 7 * 3_600_000;
const DAY_MS = 86_400_000;

/** Ngày theo giờ VN (YYYY-MM-DD) + mốc nửa đêm VN kế tiếp (UTC) */
export function vnDay(now: Date): { day: string; nextMidnight: Date } {
  const local = now.getTime() + VN_OFFSET_MS;
  const start = Math.floor(local / DAY_MS) * DAY_MS;
  return {
    day: new Date(start).toISOString().slice(0, 10),
    nextMidnight: new Date(start + DAY_MS - VN_OFFSET_MS),
  };
}

/**
 * Hạn mức gửi/ngày của nhà cung cấp SMTP (Brevo free 300/ngày). Đếm bằng Redis INCR theo ngày VN;
 * vượt → trả mốc gửi lại (nửa đêm VN), trả lại lượt đã lấy để bộ đếm đúng số thư thật.
 */
@Injectable()
export class DailyQuota {
  constructor(private readonly redis: RedisService) {}

  async take(
    limit: number,
    now = new Date(),
  ): Promise<{ ok: true } | { ok: false; retryAt: Date }> {
    const { day, nextMidnight } = vnDay(now);
    const key = `mail:daily:${day}`;
    const r = await this.redis.client
      .multi()
      .incr(key)
      .expire(key, 2 * 86_400)
      .exec();
    const used = Number(r?.[0]?.[1] ?? 0);
    if (used <= limit) return { ok: true };
    await this.redis.client.decr(key);
    return { ok: false, retryAt: nextMidnight };
  }
}
