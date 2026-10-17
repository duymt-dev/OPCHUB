import { Injectable } from '@nestjs/common';
import type { OutboxPayload } from '@opchub/shared/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationService } from './notification.service';

/** Đường dẫn Portal tới phòng: `/chat/:groupId/:key` (phòng mặc định → `/chat/:groupId`) */
const roomLink = (groupId: string, slug: string, isDefault: boolean) =>
  isDefault ? `/chat/${groupId}` : `/chat/${groupId}/${slug}`;

/**
 * Consumer outbox → thông báo cá nhân (S-04). Mỗi sự kiện đọc ngữ cảnh bằng 1 query rồi ghi 1 lô.
 * Không bao giờ tạo thông báo cho cả phòng.
 */
@Injectable()
export class NotificationEventsHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  /** @nhắc / trả lời: chỉ người còn là thành viên nhóm mới nhận */
  async chatMentioned(p: OutboxPayload<'chat.mentioned'>): Promise<void> {
    const room = await this.prisma.db.room.findUnique({
      where: { id: p.roomId },
      select: {
        slug: true,
        name: true,
        isDefault: true,
        groupId: true,
        group: {
          select: {
            members: {
              where: { userId: { in: p.userIds }, status: 'member' },
              select: { userId: true },
            },
          },
        },
      },
    });
    const sender = await this.prisma.db.user.findUnique({
      where: { id: p.senderId },
      select: { fullName: true },
    });
    if (!room || !sender) return;
    const verb = p.kind === 'reply' ? 'trả lời bạn trong' : 'nhắc đến bạn trong';
    await this.notifications.notify(
      room.group.members.map((m) => ({
        userId: m.userId,
        type: 'mention' as const,
        title: `${sender.fullName} ${verb} #${room.name}`,
        body: '',
        link: roomLink(room.groupId, room.slug, room.isDefault),
      })),
    );
  }

  async joinDecided(p: OutboxPayload<'group.request_decided'>): Promise<void> {
    const g = await this.prisma.db.group.findUnique({
      where: { id: p.groupId },
      select: { name: true },
    });
    if (!g) return;
    const approved = p.decision === 'approve';
    await this.notifications.notify([
      {
        userId: p.userId,
        type: 'group',
        title: approved
          ? `Yêu cầu tham gia ${g.name} đã được duyệt`
          : `Yêu cầu tham gia ${g.name} chưa được duyệt`,
        body: approved ? 'Chào mừng bạn! Hãy vào phòng Chung để làm quen.' : '',
        link: approved ? `/chat/${p.groupId}` : '/community',
      },
    ]);
  }

  async warned(p: OutboxPayload<'moderation.warned'>): Promise<void> {
    const room = await this.prisma.db.room.findUnique({
      where: { id: p.roomId },
      select: { slug: true, isDefault: true, groupId: true, name: true },
    });
    if (!room) return;
    await this.notifications.notify([
      {
        userId: p.userId,
        type: 'group',
        title: 'Tin nhắn của bạn vi phạm nội quy nhóm',
        body: `Quản trị viên đã cảnh báo một tin nhắn của bạn trong #${room.name}. Vui lòng xem lại nội quy.`,
        link: roomLink(room.groupId, room.slug, room.isDefault),
      },
    ]);
  }

  /** Kích hoạt / gia hạn phí thành công (chuyển trạng thái khác không báo — đã có hộp phí) */
  async feeActivated(p: OutboxPayload<'membership_fee.activated'>): Promise<void> {
    const until = p.validUntil
      ? new Date(p.validUntil).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
      : '';
    await this.notifications.notify([
      {
        userId: p.userId,
        type: 'membership',
        title: 'Đã ghi nhận phí thành viên',
        body: until ? `Thẻ thành viên có hiệu lực đến ${until}.` : '',
        link: '/membership',
      },
    ]);
  }
}
