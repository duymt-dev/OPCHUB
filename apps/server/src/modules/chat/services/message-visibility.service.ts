import { Injectable } from '@nestjs/common';
import { RoomEventsPublisher } from '@/common/realtime/room-events.publisher';
import { toChatMessage } from '../domain/message.mapper';
import { MessageRepository } from '../repositories/message.repository';

/**
 * Port Chat cho kiểm duyệt (V4-612, D-77): sau khi ẩn / khôi phục tin (transaction của caller),
 * phát `message.updated` trung lập cho phòng — tin ẩn mang `hiddenAt`, `body` rỗng.
 */
@Injectable()
export class MessageVisibilityService {
  constructor(
    private readonly messages: MessageRepository,
    private readonly events: RoomEventsPublisher,
  ) {}

  async publish(messageIds: readonly string[]): Promise<void> {
    if (!messageIds.length) return;
    const rows = await this.messages.dtos([...messageIds], null);
    await Promise.all(
      [...rows.values()].map((row) =>
        this.events.publish(row.room_id, 'message.updated', toChatMessage(row)),
      ),
    );
  }
}
