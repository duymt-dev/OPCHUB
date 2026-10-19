import { Injectable } from '@nestjs/common';
import type { MessageKind } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface RoomListRow {
  id: string;
  group_id: string;
  slug: string;
  name: string;
  description: string;
  is_default: boolean;
  created_by: string | null;
  creator_name: string | null;
  member_count: number;
  last_sender: string | null;
  last_kind: MessageKind | null;
  last_body: string | null;
  last_attachment: unknown;
}

/** Phòng chat (`rooms`) + bảng thông tin phòng (ghim, file, thành viên) */
@Injectable()
export class RoomRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Phòng + nhóm còn sống — kiểm quyền 1 lần (S-02) */
  find(roomId: string) {
    return this.prisma.db.room.findFirst({
      where: { id: roomId, group: { deletedAt: null } },
      select: { id: true, groupId: true, isDefault: true, createdBy: true, name: true },
    });
  }

  /**
   * Phòng của nhóm: mặc định trước rồi theo thứ tự tạo; tin cuối bằng LATERAL theo
   * idx messages_room_id_created_at_id_idx (1 index seek mỗi phòng, không loop ở app).
   */
  list(groupId: string): Promise<RoomListRow[]> {
    return this.prisma.db.$queryRaw<RoomListRow[]>`
      SELECT r.id, r.group_id, r.slug, r.name, r.description, r.is_default, r.created_by,
             cu.full_name AS creator_name, g.member_count,
             lm.sender AS last_sender, lm.kind AS last_kind, lm.body AS last_body, lm.attachment AS last_attachment
      FROM rooms r
      JOIN groups g ON g.id = r.group_id AND g.deleted_at IS NULL
      LEFT JOIN users cu ON cu.id = r.created_by
      LEFT JOIN LATERAL (
        SELECT coalesce(u.full_name, 'Hệ thống') AS sender, m.kind, m.body, m.attachment
        FROM messages m LEFT JOIN users u ON u.id = m.sender_id
        WHERE m.room_id = r.id AND m.hidden_at IS NULL AND m.deleted_at IS NULL
        ORDER BY m.created_at DESC, m.id DESC LIMIT 1
      ) lm ON true
      WHERE r.group_id = ${groupId}
      ORDER BY r.is_default DESC, r.created_at, r.id`;
  }

  /** Ghim mới nhất trước — idx pinned_messages (room_id, pinned_at DESC) */
  pins(roomId: string) {
    return this.prisma.db.$queryRaw<
      {
        message_id: string;
        sender_name: string | null;
        kind: MessageKind;
        body: string;
        attachment: unknown;
      }[]
    >`
      SELECT p.message_id, u.full_name AS sender_name, m.kind, m.body, m.attachment
      FROM pinned_messages p
      JOIN messages m ON m.id = p.message_id AND m.hidden_at IS NULL AND m.deleted_at IS NULL
      LEFT JOIN users u ON u.id = m.sender_id
      WHERE p.room_id = ${roomId}
      ORDER BY p.pinned_at DESC
      LIMIT 50`;
  }

  /** Tin dạng file (không ảnh), cũ → mới */
  files(roomId: string) {
    return this.prisma.db.message.findMany({
      where: { roomId, kind: 'file', hiddenAt: null, deletedAt: null },
      select: { id: true, attachment: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 200,
    });
  }

  /** Thành viên nhóm (trang đầu: chủ nhóm → giảng viên → thành viên, theo thứ tự enum) — gợi ý @nhắc + panel */
  members(groupId: string, take: number) {
    return this.prisma.db.groupMember.findMany({
      where: { groupId, status: 'member', user: { deletedAt: null } },
      select: {
        groupRole: true,
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            position: true,
            businessProfile: { select: { companyName: true } },
          },
        },
      },
      orderBy: [{ groupRole: 'asc' }, { createdAt: 'asc' }, { userId: 'asc' }],
      take,
    });
  }
}
