import { Inject, Injectable } from '@nestjs/common';
import { ENV, type Env } from '@/common/config';
import { RedisService } from '@/common/redis/redis.service';
import { HandshakeError } from './socket-types';

const WINDOW_SEC = 60;
export const SOCKET_RATE_LIMITED_MESSAGE = 'Bạn kết nối quá nhanh, vui lòng thử lại sau';

/** Phần handshake cần để lấy IP — không phụ thuộc kiểu Socket của socket.io */
export interface HandshakeLike {
  address: string;
  headers: Record<string, string | string[] | undefined>;
}

/**
 * TD-018: giới hạn handshake socket theo IP (trước khi xác thực) và theo tài khoản (sau khi xác
 * thực) bằng Redis INCR + EX 60 — không query DB (S-09). Tắt cùng rate limit REST khi
 * `RATE_LIMIT_DISABLED` (dev/e2e một máy, cấm ở production).
 */
@Injectable()
export class ConnectRate {
  constructor(
    private readonly redis: RedisService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** IP như REST: sau Nginx (`TRUST_PROXY`) lấy `X-Real-IP`, ngược lại địa chỉ kết nối */
  ipOf(h: HandshakeLike): string {
    const real = h.headers['x-real-ip'];
    const fromProxy = Array.isArray(real) ? real[0] : real;
    return this.env.TRUST_PROXY && fromProxy ? fromProxy.trim() : h.address;
  }

  hitIp(h: HandshakeLike): Promise<void> {
    return this.hit(`socket:conn:ip:${this.ipOf(h)}`);
  }

  hitUser(userId: string): Promise<void> {
    return this.hit(`socket:conn:u:${userId}`);
  }

  private async hit(key: string): Promise<void> {
    if (this.env.RATE_LIMIT_DISABLED) return;
    const n = await this.redis.client.incr(key);
    if (n === 1) await this.redis.client.expire(key, WINDOW_SEC);
    if (n > this.env.SOCKET_CONNECT_PER_MIN) {
      throw new HandshakeError('RATE_LIMITED', SOCKET_RATE_LIMITED_MESSAGE);
    }
  }
}
