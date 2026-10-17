import { Injectable } from '@nestjs/common';
import { serverEvents, type ServerEventName, type ServerPayload } from '@opchub/shared/socket';
import { z } from 'zod';
import { RedisService } from '../redis/redis.service';

/** Kênh Redis process api/worker → process socket (B22 subscribe rồi emit vào room `user:{id}`) */
export const USER_EVENTS_CHANNEL = 'socket:user';

export const userEventEnvelopeSchema = z.object({
  userId: z.string(),
  event: z.string(),
  data: z.unknown(),
});
export type UserEventEnvelope = z.infer<typeof userEventEnvelopeSchema>;

/**
 * Đẩy sự kiện realtime tới một người (S-04: không truy vấn DB theo người nhận ở socket).
 * Payload parse theo hợp đồng `serverEvents` trước khi publish.
 */
@Injectable()
export class UserEventsPublisher {
  constructor(private readonly redis: RedisService) {}

  async publish<E extends ServerEventName>(
    userId: string,
    event: E,
    data: ServerPayload<E>,
  ): Promise<void> {
    const parsed: unknown = (serverEvents[event] as z.ZodType).parse(data);
    const msg: UserEventEnvelope = { userId, event, data: parsed };
    await this.redis.client.publish(USER_EVENTS_CHANNEL, JSON.stringify(msg));
  }
}
