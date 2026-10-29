import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface TopicRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  isDefault: boolean;
}

const TOPIC_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  isDefault: true,
} as const;

/** D-111: chủ đề còn sống của nhóm còn sống — đổi tên / xoá mềm có điều kiện `deleted_at IS NULL` */
@Injectable()
export class GroupTopicsRepository {
  constructor(private readonly prisma: PrismaService) {}

  find(groupId: string, roomId: string): Promise<TopicRow | null> {
    return this.prisma.db.room.findFirst({
      where: { id: roomId, groupId, deletedAt: null, group: { deletedAt: null } },
      select: TOPIC_SELECT,
    });
  }

  /** Trùng tên (không phân biệt hoa thường) với chủ đề còn sống khác của nhóm */
  async nameTaken(groupId: string, roomId: string, name: string): Promise<boolean> {
    const hit = await this.prisma.db.room.findFirst({
      where: {
        groupId,
        deletedAt: null,
        id: { not: roomId },
        name: { equals: name, mode: 'insensitive' },
      },
      select: { id: true },
    });
    return !!hit;
  }

  /** Cập nhật có điều kiện — `null` khi phòng vừa bị xoá */
  async rename(
    tx: DbTx,
    roomId: string,
    data: { name: string; description: string },
  ): Promise<TopicRow | null> {
    const n = await tx.room.updateMany({ where: { id: roomId, deletedAt: null }, data });
    if (!n.count) return null;
    return tx.room.findUnique({ where: { id: roomId }, select: TOPIC_SELECT });
  }

  /** Xoá mềm — không đụng phòng mặc định (CHECK `rooms_default_not_deleted_check` chặn thêm ở DB) */
  async softDelete(tx: DbTx, roomId: string, actorId: string): Promise<boolean> {
    const n = await tx.room.updateMany({
      where: { id: roomId, deletedAt: null, isDefault: false },
      data: { deletedAt: new Date(), deletedBy: actorId },
    });
    return n.count === 1;
  }

  /** Phòng còn sống của nhóm — đích phát `room.reload` */
  async liveRoomIds(groupId: string): Promise<string[]> {
    const rows = await this.prisma.db.room.findMany({
      where: { groupId, deletedAt: null },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }
}
