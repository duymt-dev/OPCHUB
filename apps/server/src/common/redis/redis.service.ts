import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ENV, type Env } from '../config';
import { redisPubSubChannel } from './pubsub-channel';

export const REDIS_PREFIX = 'opchub:';

/**
 * Một kết nối ioredis chính mỗi process (keyPrefix `opchub:`, db theo REDIS_DB).
 * `duplicate()` cho pub/sub, BullMQ, socket adapter — các kết nối này tự quản lý vòng đời.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;
  private readonly extra: Redis[] = [];

  constructor(@Inject(ENV) private readonly env: Env) {
    this.client = this.create(REDIS_PREFIX);
  }

  channel(base: string): string {
    return redisPubSubChannel(base, this.env.REDIS_DB);
  }

  /** Kết nối riêng; `prefix` rỗng cho BullMQ (BullMQ tự đặt prefix) */
  duplicate(opts: { prefix?: string; blocking?: boolean } = {}): Redis {
    const c = this.create(opts.prefix ?? REDIS_PREFIX, opts.blocking ?? false);
    this.extra.push(c);
    return c;
  }

  private create(keyPrefix: string, blocking = false): Redis {
    return new Redis(this.env.REDIS_URL, {
      db: this.env.REDIS_DB,
      keyPrefix,
      lazyConnect: false,
      // BullMQ worker cần null; client thường giữ mặc định để lỗi nhanh
      maxRetriesPerRequest: blocking ? null : 3,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(
      [this.client, ...this.extra].map((c) => c.quit().catch(() => c.disconnect())),
    );
  }
}
