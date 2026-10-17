import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AppError } from '@/common/errors';
import { RedisService } from '@/common/redis/redis.service';

/** D-44: sai 5 lần → khoá 15 phút theo tài khoản + IP */
export const MAX_FAILS = 5;
export const LOCK_SEC = 15 * 60;

/**
 * Khoá theo cặp (định danh, IP): kẻ tấn công từ IP khác không khoá được chủ TK, và định danh
 * chưa tồn tại cũng bị đếm (không lộ TK có thật). Định danh băm để không lưu email/SĐT thô.
 */
@Injectable()
export class LoginLockService {
  constructor(private readonly redis: RedisService) {}

  private key(identifier: string, ip: string): string {
    const h = createHash('sha256').update(`${identifier}|${ip}`).digest('hex').slice(0, 32);
    return `auth:login_fail:${h}`;
  }

  /** Đang khoá → 429 kèm Retry-After */
  async assertNotLocked(identifier: string, ip: string): Promise<void> {
    const k = this.key(identifier, ip);
    const [count, ttl] = await Promise.all([this.redis.client.get(k), this.redis.client.ttl(k)]);
    if (Number(count ?? 0) >= MAX_FAILS) {
      const wait = ttl > 0 ? ttl : LOCK_SEC;
      throw new AppError(
        'RATE_LIMITED',
        `Bạn đã nhập sai quá ${MAX_FAILS} lần. Vui lòng thử lại sau ${Math.ceil(wait / 60)} phút`,
        undefined,
        wait,
      );
    }
  }

  async recordFailure(identifier: string, ip: string): Promise<void> {
    const k = this.key(identifier, ip);
    const n = await this.redis.client.incr(k);
    // TTL đặt từ lần sai đầu; lần thứ 5 làm mới thành đủ 15 phút khoá
    if (n === 1 || n >= MAX_FAILS) await this.redis.client.expire(k, LOCK_SEC);
  }

  async reset(identifier: string, ip: string): Promise<void> {
    await this.redis.client.del(this.key(identifier, ip));
  }
}
