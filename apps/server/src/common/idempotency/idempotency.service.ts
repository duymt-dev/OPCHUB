import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { AppError } from '../errors';
import { RedisService } from '../redis/redis.service';

const TTL_SEC = 24 * 3600;
/** Khoá đang chạy: request thứ hai cùng key trong lúc này → 409 */
const LOCK_SEC = 30;
const PENDING = '__pending__';

const keyOf = (scope: string, userId: string, key: string) =>
  `idem:${scope}:${userId}:${createHash('sha256').update(key).digest('hex').slice(0, 32)}`;

/**
 * `Idempotency-Key` (api-conventions.md): cùng user + key trong 24h → trả lại kết quả cũ,
 * không chạy lại. Thiếu header → 400.
 */
@Injectable()
export class IdempotencyService {
  constructor(private readonly redis: RedisService) {}

  /** Kết quả lưu lại được parse bằng schema khi trả lần sau (dữ liệu từ Redis) */
  async run<T>(
    scope: string,
    userId: string,
    key: string | undefined,
    schema: z.ZodType<T>,
    fn: () => Promise<T>,
  ): Promise<T> {
    if (!key || key.length > 200) {
      throw new AppError('VALIDATION_ERROR', 'Thiếu header Idempotency-Key');
    }
    const k = keyOf(scope, userId, key);
    const prev = await this.redis.client.get(k);
    if (prev && prev !== PENDING) {
      const hit = schema.safeParse(JSON.parse(prev));
      if (hit.success) return hit.data;
    }
    if (prev) {
      throw new AppError('CONFLICT', 'Yêu cầu cùng Idempotency-Key đang được xử lý');
    }
    if ((await this.redis.client.set(k, PENDING, 'EX', LOCK_SEC, 'NX')) !== 'OK') {
      throw new AppError('CONFLICT', 'Yêu cầu cùng Idempotency-Key đang được xử lý');
    }
    try {
      const body = await fn();
      await this.redis.client.set(k, JSON.stringify(body), 'EX', TTL_SEC);
      return body;
    } catch (err) {
      await this.redis.client.del(k);
      throw err;
    }
  }
}
