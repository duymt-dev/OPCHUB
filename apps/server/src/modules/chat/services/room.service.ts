import { Injectable } from '@nestjs/common';
import {
  type ChatRoom,
  type CreateTopicRequest,
  type RoomFile,
  type RoomMember,
  type RoomPin,
  attachmentSchema,
} from '@opchub/shared/api-domains';
import type { AccessClaims } from '@/common/auth';
import { conflict, forbidden, notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PresenceService } from '@/common/realtime/presence.service';
import { previewText } from '../domain/message.mapper';
import { roomIdOf, topicSlug } from '../domain/room-key';
import { RoomRepository } from '../repositories/room.repository';
import { ChatAccessService } from './chat-access.service';
import { UnreadService } from './unread.service';

const MEMBER_PAGE = 50;

/** Phòng/chủ đề + bảng thông tin phòng (P-28 → P-48) */
@Injectable()
export class RoomService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rooms: RoomRepository,
    private readonly access: ChatAccessService,
    private readonly unread: UnreadService,
    private readonly presence: PresenceService,
  ) {}

  async list(user: AccessClaims, groupId: string): Promise<{ admin: boolean; items: ChatRoom[] }> {
    const { admin } = await this.access.assertRead(user, groupId);
    const rows = await this.rooms.list(groupId);
    if (!rows.length) throw notFound('Không tìm thấy nhóm');
    const ids = rows.map((r) => r.id);
    const [unread, online] = await Promise.all([
      admin ? Promise.resolve(new Map<string, number>()) : this.unread.counts(user.sub, ids),
      this.presence.counts(ids),
    ]);
    return {
      admin,
      items: rows.map((r) => ({
        id: r.id,
        groupId: r.group_id,
        name: r.name,
        description: r.description,
        isDefault: r.is_default,
        key: r.slug,
        createdBy: r.is_default ? null : r.creator_name,
        mine: !r.is_default && r.created_by === user.sub,
        lastMessage:
          r.last_kind !== null
            ? {
                senderName: r.last_sender ?? '',
                text: previewText(r.last_kind, r.last_body ?? '', r.last_attachment),
              }
            : null,
        unread: unread.get(r.id) ?? 0,
        online: online.get(r.id) ?? 0,
        memberCount: r.member_count,
      })),
    };
  }

  /** Thành viên tạo chủ đề; trùng tên (không phân biệt hoa thường, gồm "Chung") → 409 */
  async create(user: AccessClaims, groupId: string, body: CreateTopicRequest): Promise<ChatRoom> {
    await this.access.assertMember(user, groupId);
    const existing = await this.rooms.names(groupId);
    const lower = body.name.toLocaleLowerCase('vi');
    if (existing.some((r) => r.name.toLocaleLowerCase('vi') === lower)) {
      throw conflict('Chủ đề này đã có trong nhóm');
    }
    const slug = topicSlug(body.name, new Set(existing.map((r) => r.slug)));
    const id = roomIdOf(groupId, slug);
    await this.prisma.db.$transaction((tx) =>
      this.rooms.create(tx, {
        id,
        groupId,
        slug,
        name: body.name,
        description: body.description || 'Chủ đề mới',
        by: user.sub,
      }),
    );
    const created = (await this.list(user, groupId)).items.find((r) => r.id === id);
    if (!created) throw notFound('Không tìm thấy chủ đề');
    return created;
  }

  async remove(user: AccessClaims, roomId: string): Promise<{ id: string }> {
    const room = await this.rooms.find(roomId);
    if (!room) throw notFound('Không tìm thấy chủ đề');
    const ok = await this.prisma.db.$transaction((tx) =>
      this.rooms.deleteOwnTopic(tx, roomId, user.sub),
    );
    if (!ok) throw forbidden('Bạn chỉ xoá được chủ đề do mình tạo');
    return { id: roomId };
  }

  async markRead(user: AccessClaims, roomId: string): Promise<{ id: string }> {
    await this.access.room(roomId);
    await this.unread.markRead(user.sub, roomId);
    return { id: roomId };
  }

  async pins(user: AccessClaims, roomId: string): Promise<RoomPin[]> {
    const room = await this.access.room(roomId);
    await this.access.assertRead(user, room.groupId);
    const rows = await this.rooms.pins(roomId);
    return rows.map((r) => ({
      messageId: r.message_id,
      senderName: r.sender_name ?? 'Hệ thống',
      text: previewText(r.kind, r.body, r.attachment),
    }));
  }

  async files(user: AccessClaims, roomId: string): Promise<RoomFile[]> {
    const room = await this.access.room(roomId);
    await this.access.assertRead(user, room.groupId);
    const rows = await this.rooms.files(roomId);
    return rows.flatMap((r) => {
      const a = attachmentSchema.safeParse(r.attachment);
      if (!a.success) return [];
      const { name, size, ext, url } = a.data;
      return [{ messageId: r.id, name, size, ext, url: url ?? null }];
    });
  }

  /** Trang đầu thành viên + tổng (`member_count`); online = có socket trong phòng bất kỳ của user? → dùng presence phòng */
  async members(
    user: AccessClaims,
    roomId: string,
  ): Promise<{ items: RoomMember[]; total: number }> {
    const room = await this.access.room(roomId);
    await this.access.assertRead(user, room.groupId);
    const [rows, group] = await Promise.all([
      this.rooms.members(room.groupId, MEMBER_PAGE),
      this.prisma.db.group.findUniqueOrThrow({
        where: { id: room.groupId },
        select: { memberCount: true },
      }),
    ]);
    const online = await this.presence.usersOnline(rows.map((r) => r.user.id));
    return {
      items: rows.map((r) => ({
        id: r.user.id,
        name: r.user.fullName,
        title: [r.user.position, r.user.businessProfile?.companyName].filter(Boolean).join(' · '),
        avatarUrl: r.user.avatarUrl,
        online: online.has(r.user.id),
        isModerator: r.groupRole !== 'member',
      })),
      total: group.memberCount,
    };
  }
}
