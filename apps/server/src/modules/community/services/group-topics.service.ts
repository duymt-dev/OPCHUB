import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { type AdminRoom, ROOM_ADMIN_MESSAGES, type RoomRename } from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { conflict, notFound } from '@/common/errors';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { GroupTopicsRepository, type TopicRow } from '../repositories/group-topics.repository';
import type { Actor } from './group-admin.service';

const toAdminRoom = (r: TopicRow): AdminRoom => ({
  id: r.id,
  key: r.slug,
  name: r.name,
  description: r.description,
  isDefault: r.isDefault,
});

/**
 * D-111 (§27.7 "Chỉ Admin quản lý cộng đồng tạo/sửa/xóa chủ đề"): đổi tên + xoá mềm chủ đề. "Chung" chỉ đổi
 * mô tả, không xoá; tin của chủ đề đã xoá giữ trong DB, ẩn khỏi Portal. Audit + outbox `group.topic_changed`
 * (Portal đang mở nhóm tải lại danh sách chủ đề) cùng transaction.
 */
@Injectable()
export class GroupTopicsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: GroupTopicsRepository,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  async rename(
    actor: Actor,
    groupId: string,
    roomId: string,
    input: RoomRename,
  ): Promise<AdminRoom> {
    const room = await this.repo.find(groupId, roomId);
    if (!room) throw notFound(ROOM_ADMIN_MESSAGES.notFound);
    if (room.isDefault && input.name !== room.name)
      throw conflict(ROOM_ADMIN_MESSAGES.defaultLocked);
    if (await this.repo.nameTaken(groupId, roomId, input.name)) {
      throw conflict(ROOM_ADMIN_MESSAGES.duplicate);
    }
    return this.prisma.db.$transaction(async (tx) => {
      const next = await this.repo.rename(tx, roomId, input);
      if (!next) throw notFound(ROOM_ADMIN_MESSAGES.notFound);
      await this.log(
        tx,
        actor,
        'group.topic_rename',
        roomId,
        `Đổi tên chủ đề ${room.name} → ${next.name}`,
      );
      await this.outbox.add(tx, 'group.topic_changed', { groupId, roomId });
      return toAdminRoom(next);
    });
  }

  async remove(actor: Actor, groupId: string, roomId: string): Promise<{ id: string }> {
    const room = await this.repo.find(groupId, roomId);
    if (!room) throw notFound(ROOM_ADMIN_MESSAGES.notFound);
    if (room.isDefault) throw conflict(ROOM_ADMIN_MESSAGES.defaultLocked);
    await this.prisma.db.$transaction(async (tx) => {
      if (!(await this.repo.softDelete(tx, roomId, actor.id))) {
        throw notFound(ROOM_ADMIN_MESSAGES.notFound);
      }
      await this.log(tx, actor, 'group.topic_delete', roomId, `Xoá chủ đề ${room.name}`);
      await this.outbox.add(tx, 'group.topic_changed', { groupId, roomId });
    });
    return { id: roomId };
  }

  private log(tx: DbTx, actor: Actor, action: string, entityId: string, summary: string) {
    return this.audit.log(tx, {
      actorId: actor.id,
      action,
      entity: 'room',
      entityId,
      tag: 'content',
      summary,
      ip: actor.ip,
    });
  }
}
