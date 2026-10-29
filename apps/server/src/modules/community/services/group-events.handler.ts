import { Injectable } from '@nestjs/common';
import type { OutboxPayload } from '@opchub/shared/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RoomEventsPublisher } from '@/common/realtime/room-events.publisher';

/**
 * NA-09: consumer `group.topic_created` → `room.created` vào mọi phòng socket sẵn có của nhóm (người
 * đang mở chat nhóm nhận ngay, client tải lại danh sách chủ đề). 1 query lấy id phòng, không theo người.
 */
@Injectable()
export class GroupEventsHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rooms: RoomEventsPublisher,
  ) {}

  async topicCreated(p: OutboxPayload<'group.topic_created'>): Promise<void> {
    const all = await this.prisma.db.room.findMany({
      where: { groupId: p.groupId, deletedAt: null },
      select: { id: true },
    });
    const targets = all.map((r) => r.id).filter((id) => !p.roomIds.includes(id));
    for (const roomId of p.roomIds) {
      await this.rooms.roomCreated(targets, { groupId: p.groupId, roomId });
    }
  }

  /**
   * D-111: chủ đề đổi tên / xoá mềm → `room.reload` vào mọi phòng còn sống của nhóm + chính phòng đó (người
   * đang mở chủ đề vừa xoá tải lại → 404, về "Chung"). 1 query id phòng.
   */
  async topicChanged(p: OutboxPayload<'group.topic_changed'>): Promise<void> {
    const live = await this.prisma.db.room.findMany({
      where: { groupId: p.groupId, deletedAt: null },
      select: { id: true },
    });
    await this.rooms.reload([...live.map((r) => r.id), p.roomId]);
  }
}
