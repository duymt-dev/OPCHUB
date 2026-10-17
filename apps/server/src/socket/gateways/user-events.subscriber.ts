import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { serverEvents, socketRooms } from '@opchub/shared/socket';
import type { Redis } from 'ioredis';
import type { Server } from 'socket.io';
import type { z } from 'zod';
import {
  USER_EVENTS_CHANNEL,
  userEventEnvelopeSchema,
} from '@/common/realtime/user-events.publisher';
import { RedisService } from '@/common/redis/redis.service';

const isServerEvent = (e: string): e is keyof typeof serverEvents => e in serverEvents;

/**
 * Kênh `socket:user` (api/worker publish) → emit vào room `user:{id}`.
 * Mọi process socket cùng subscribe kênh này nên mỗi process chỉ phát cho socket **cục bộ**
 * (`io.local`) — không phát lại qua adapter, tránh nhận trùng.
 * `session.revoked` → emit rồi ngắt mọi socket của user (thu hồi phiên).
 */
@Injectable()
export class UserEventsSubscriber implements OnModuleDestroy {
  private readonly logger = new Logger(UserEventsSubscriber.name);
  private sub: Redis | null = null;

  constructor(private readonly redis: RedisService) {}

  async start(io: Server): Promise<void> {
    this.sub = this.redis.duplicate();
    this.sub.on('message', (_channel: string, raw: string) => this.dispatch(io, raw));
    await this.sub.subscribe(USER_EVENTS_CHANNEL);
  }

  private dispatch(io: Server, raw: string): void {
    try {
      const env = userEventEnvelopeSchema.parse(JSON.parse(raw));
      if (!isServerEvent(env.event)) return;
      const data: unknown = (serverEvents[env.event] as z.ZodType).parse(env.data);
      // `local`: mỗi process tự nhận tin từ kênh này — không nhân bản qua adapter
      const target = io.local.to(socketRooms.user(env.userId));
      target.emit(env.event, data);
      if (env.event === 'session.revoked') target.disconnectSockets(true);
    } catch (err) {
      this.logger.warn({ err }, 'Bỏ qua sự kiện socket:user không hợp lệ');
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.sub?.quit().catch(() => undefined);
  }
}
