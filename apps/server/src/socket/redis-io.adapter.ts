import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import type { Server, ServerOptions } from 'socket.io';
import type { Env } from '@/common/config';
import { redisPubSubChannel } from '@/common/redis/pubsub-channel';

/**
 * Socket.IO nhiều process (S-09): `@socket.io/redis-adapter`, chỉ transport websocket,
 * CORS theo CORS_ORIGINS. Kênh adapter có prefix riêng `opchub:io`.
 * Adapter tự giữ 2 kết nối pub/sub (không keyPrefix) và đóng chúng SAU khi đóng server —
 * không mượn RedisService vì nó đóng trước ở onModuleDestroy.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly conns: Redis[] = [];

  constructor(
    ctx: INestApplicationContext,
    private readonly env: Env,
  ) {
    super(ctx);
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, {
      ...options,
      transports: ['websocket'],
      cors: { origin: this.env.CORS_ORIGINS, credentials: true },
      pingInterval: 25_000,
      pingTimeout: 20_000,
    }) as Server;
    const pub = new Redis(this.env.REDIS_URL, { db: this.env.REDIS_DB });
    const sub = pub.duplicate();
    this.conns.push(pub, sub);
    server.adapter(
      createAdapter(pub, sub, { key: redisPubSubChannel('opchub:io', this.env.REDIS_DB) }),
    );
    return server;
  }

  override async dispose(): Promise<void> {
    await super.dispose();
    await Promise.all(this.conns.map((c) => c.quit().catch(() => c.disconnect())));
  }
}
