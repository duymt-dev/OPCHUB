import { Injectable } from '@nestjs/common';
import { type ChatMessage, chatMessageSchema } from '@opchub/shared/api-domains';
import { z } from 'zod';
import { RedisService } from '../redis/redis.service';

/** Kênh Redis api/worker → process socket: phát vào room `room:{id}` (S-02) */
export const ROOM_EVENTS_CHANNEL = 'socket:room';

export const ROOM_EVENTS = ['message.new', 'message.updated'] as const;

/** NA-09: chủ đề mới — phát vào mọi phòng sẵn có của nhóm, client tải lại danh sách chủ đề */
export const roomCreatedSchema = z.object({ groupId: z.string(), roomId: z.string() });

/** NA-25: tin mới → +1 chưa đọc ở client (phát vào `group:{id}`, một emit cho cả nhóm) */
export const unreadBumpSchema = z.object({
  roomId: z.string(),
  groupId: z.string(),
  senderId: z.string().nullable(),
});

export const roomEventEnvelopeSchema = z.discriminatedUnion('event', [
  z.object({ roomId: z.string(), event: z.enum(ROOM_EVENTS), data: chatMessageSchema }),
  z.object({ roomId: z.string(), event: z.literal('room.created'), data: roomCreatedSchema }),
  z.object({ groupId: z.string(), event: z.literal('unread.bump'), data: unreadBumpSchema }),
]);
export type RoomEventEnvelope = z.infer<typeof roomEventEnvelopeSchema>;

/**
 * Phát tin vào phòng sau commit — 1 PUBLISH, process socket fan-out qua room (không query theo người nhận).
 * DTO phát chung là góc nhìn trung lập (`myReactions`/`reportedByMe` rỗng); client giữ phần riêng của mình.
 */
@Injectable()
export class RoomEventsPublisher {
  constructor(private readonly redis: RedisService) {}

  async publish(
    roomId: string,
    event: (typeof ROOM_EVENTS)[number],
    data: ChatMessage,
  ): Promise<void> {
    const msg: RoomEventEnvelope = { roomId, event, data: chatMessageSchema.parse(data) };
    await this.redis.client.publish(ROOM_EVENTS_CHANNEL, JSON.stringify(msg));
  }

  /** NA-25: 1 PUBLISH mỗi tin — client trong room nhóm tự cộng, không truy vấn theo người nhận (S-04) */
  async unreadBump(data: z.infer<typeof unreadBumpSchema>): Promise<void> {
    const body = unreadBumpSchema.parse(data);
    const msg: RoomEventEnvelope = { groupId: body.groupId, event: 'unread.bump', data: body };
    await this.redis.client.publish(ROOM_EVENTS_CHANNEL, JSON.stringify(msg));
  }

  /** NA-09: một PUBLISH mỗi phòng của nhóm (số phòng nhỏ) — không truy vấn theo người nhận (S-04) */
  async roomCreated(toRoomIds: readonly string[], data: z.infer<typeof roomCreatedSchema>) {
    const body = roomCreatedSchema.parse(data);
    const pipe = this.redis.client.pipeline();
    for (const roomId of toRoomIds) {
      const msg: RoomEventEnvelope = { roomId, event: 'room.created', data: body };
      pipe.publish(ROOM_EVENTS_CHANNEL, JSON.stringify(msg));
    }
    await pipe.exec();
  }
}
