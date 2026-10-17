import { Inject, Injectable } from '@nestjs/common';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { ENV, type Env } from '@/common/config';
import { AppError } from '@/common/errors';
import { RedisService } from '@/common/redis/redis.service';

export const OTP_TTL_SEC = 600;
/** Sai 5 lần → mã bị huỷ, phải gửi lại */
export const OTP_MAX_FAILS = 5;
/** Gửi (kể cả lần đầu) tối đa 3 lần / 15 phút / email */
export const OTP_MAX_SENDS = 3;
const SEND_WINDOW_SEC = 15 * 60;

export const OTP_INVALID_MESSAGE = 'Mã OTP không đúng';

const key = {
  code: (email: string) => `otp:${email}`,
  fails: (email: string) => `otp:fails:${email}`,
  sends: (email: string) => `otp:sends:${email}`,
};

/**
 * OTP email 6 số (auth-rbac.md): chỉ lưu HMAC của mã, so sánh timing-safe, giới hạn lần sai
 * và lần gửi. Mục đích (`purpose`) nằm trong HMAC để mã đăng ký không dùng được cho việc khác.
 */
@Injectable()
export class OtpService {
  constructor(
    private readonly redis: RedisService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private digest(purpose: string, email: string, code: string): string {
    return createHmac('sha256', this.env.JWT_SECRET)
      .update(`${purpose}|${email}|${code}`)
      .digest('hex');
  }

  /** Sinh mã mới (huỷ mã cũ + đếm sai). Vượt giới hạn gửi → 429 */
  async issue(purpose: string, email: string): Promise<string> {
    const sends = await this.redis.client.incr(key.sends(email));
    if (sends === 1) await this.redis.client.expire(key.sends(email), SEND_WINDOW_SEC);
    if (sends > OTP_MAX_SENDS) {
      const ttl = await this.redis.client.ttl(key.sends(email));
      const wait = ttl > 0 ? ttl : SEND_WINDOW_SEC;
      throw new AppError(
        'RATE_LIMITED',
        `Bạn đã yêu cầu mã quá nhiều lần. Vui lòng thử lại sau ${Math.ceil(wait / 60)} phút`,
        undefined,
        wait,
      );
    }
    // Q-B11-2: dev/test dùng mã cố định cho e2e; env schema cấm ở production
    const code = this.env.OTP_FIXED_CODE ?? String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.redis.client
      .multi()
      .set(key.code(email), this.digest(purpose, email, code), 'EX', OTP_TTL_SEC)
      .del(key.fails(email))
      .exec();
    return code;
  }

  /** Đúng → xoá mã (dùng một lần). Sai → 422; sai đủ 5 lần → huỷ mã */
  async verify(purpose: string, email: string, code: string): Promise<void> {
    const stored = await this.redis.client.get(key.code(email));
    const given = this.digest(purpose, email, code);
    const ok =
      stored !== null &&
      stored.length === given.length &&
      timingSafeEqual(Buffer.from(stored), Buffer.from(given));
    if (ok) {
      await this.redis.client.del(key.code(email), key.fails(email));
      return;
    }
    if (stored !== null) {
      const fails = await this.redis.client.incr(key.fails(email));
      if (fails === 1) await this.redis.client.expire(key.fails(email), OTP_TTL_SEC);
      if (fails >= OTP_MAX_FAILS) await this.redis.client.del(key.code(email), key.fails(email));
    }
    throw new AppError('OTP_INVALID', OTP_INVALID_MESSAGE);
  }

  /** Dọn sau khi kích hoạt thành công */
  async clearSends(email: string): Promise<void> {
    await this.redis.client.del(key.sends(email));
  }
}
