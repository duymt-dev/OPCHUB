import { Injectable } from '@nestjs/common';
import { type ChatMessage, chatMessageSchema } from '@opchub/shared/api-domains';
import { z } from 'zod';
import { RedisService } from '../redis/redis.service';

/** Kênh Redis api/worker → process socket: phát vào room `room:{id}` (S-02) */
export const ROOM_EVENTS_CHANNEL = 'socket:room';

export const ROOM_EVENTS = ['message.new', 'message.updated'] as const;

export const roomEventEnvelopeSchema = z.object({
  roomId: z.string(),
  event: z.enum(ROOM_EVENTS),
  data: chatMessageSchema,
});
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
}
