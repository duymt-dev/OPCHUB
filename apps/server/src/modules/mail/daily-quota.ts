import { Injectable } from '@nestjs/common';
import { RedisService } from '@/common/redis/redis.service';
import { CAMPAIGN_PRIORITY, DEFAULT_PRIORITY, URGENT_PRIORITY } from './mail-priority';

const VN_OFFSET_MS = 7 * 3_600_000;
const DAY_MS = 86_400_000;
const MORNING_MS = 8 * 3_600_000;

/** Ngày theo giờ VN (YYYY-MM-DD) + mốc nửa đêm VN kế tiếp và 08:00 VN ngày sau (UTC) */
export function vnDay(now: Date): { day: string; nextMidnight: Date; nextMorning: Date } {
  const local = now.getTime() + VN_OFFSET_MS;
  const start = Math.floor(local / DAY_MS) * DAY_MS;
  return {
    day: new Date(start).toISOString().slice(0, 10),
    nextMidnight: new Date(start + DAY_MS - VN_OFFSET_MS),
    nextMorning: new Date(start + DAY_MS + MORNING_MS - VN_OFFSET_MS),
  };
}

export interface QuotaOpts {
  /** `mail_logs.priority` (1 = OTP / đặt lại MK) */
  priority?: number;
  /** Số thư/ngày chỉ OTP được dùng (`MAIL_OTP_RESERVE`) */
  reserve?: number;
}

export type QuotaResult = { ok: true } | { ok: false; retryAt: Date };

/**
 * Hạn mức gửi/ngày của nhà cung cấp SMTP (Brevo free 300/ngày). Đếm bằng Redis INCR theo ngày VN.
 * NA-05: thư thường chỉ dùng tới `limit - reserve`; OTP / đặt lại MK dùng tới `limit`. Vượt → trả
 * lượt đã lấy (bộ đếm đúng số thư thật) và mốc gửi lại: chiến dịch 08:00 VN ngày sau, còn lại nửa đêm.
 */
@Injectable()
export class DailyQuota {
  constructor(private readonly redis: RedisService) {}

  async take(limit: number, now = new Date(), opts: QuotaOpts = {}): Promise<QuotaResult> {
    const priority = opts.priority ?? DEFAULT_PRIORITY;
    const cap = priority <= URGENT_PRIORITY ? limit : Math.max(0, limit - (opts.reserve ?? 0));
    const { day, nextMidnight, nextMorning } = vnDay(now);
    const key = `mail:daily:${day}`;
    const r = await this.redis.client
      .multi()
      .incr(key)
      .expire(key, 2 * 86_400)
      .exec();
    const used = Number(r?.[0]?.[1] ?? 0);
    if (used <= cap) return { ok: true };
    await this.redis.client.decr(key);
    return { ok: false, retryAt: priority >= CAMPAIGN_PRIORITY ? nextMorning : nextMidnight };
  }
}
