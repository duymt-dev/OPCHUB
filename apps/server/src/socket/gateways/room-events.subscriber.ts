import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { socketRooms } from '@opchub/shared/socket';
import type { Redis } from 'ioredis';
import type { Server } from 'socket.io';
import {
  ROOM_EVENTS_CHANNEL,
  roomEventEnvelopeSchema,
} from '@/common/realtime/room-events.publisher';
import { RedisService } from '@/common/redis/redis.service';

/**
 * Kênh `socket:room` (REST/socket publish sau commit) → emit vào `room:{id}` cho socket cục bộ.
 * Mọi process cùng subscribe nên dùng `io.local` — không phát lại qua adapter.
 */
@Injectable()
export class RoomEventsSubscriber implements OnModuleDestroy {
  private readonly logger = new Logger(RoomEventsSubscriber.name);
  private sub: Redis | null = null;

  constructor(private readonly redis: RedisService) {}

  async start(io: Server): Promise<void> {
    this.sub = this.redis.duplicate();
    this.sub.on('message', (_channel: string, raw: string) => {
      try {
        const env = roomEventEnvelopeSchema.parse(JSON.parse(raw));
        io.local.to(socketRooms.room(env.roomId)).emit(env.event, env.data);
      } catch (err) {
        this.logger.warn({ err }, 'Bỏ qua sự kiện socket:room không hợp lệ');
      }
    });
    await this.sub.subscribe(ROOM_EVENTS_CHANNEL);
  }

  async onModuleDestroy(): Promise<void> {
    await this.sub?.quit().catch(() => undefined);
  }
}
