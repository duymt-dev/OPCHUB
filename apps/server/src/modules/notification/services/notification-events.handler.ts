import { Injectable } from '@nestjs/common';
import { moderationWarningContent, moderationWarningId } from '@opchub/shared';
import type { OutboxPayload } from '@opchub/shared/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationService } from './notification.service';

const VN_WHEN = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const vnWhen = (d: Date) => VN_WHEN.format(d);

/** AT-EV02: "Link phòng họp: meet.google.com/…" (online / offline có phát) hoặc địa chỉ */
const eventWhere = (ev: { meetUrl: string | null; address: string | null }) =>
  ev.meetUrl
    ? `Link phòng họp: ${ev.meetUrl.replace(/^https:\/\//, '')} · `
    : ev.address
      ? `${ev.address} · `
      : '';

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
    // D-111: chủ đề vừa bị xoá mềm → không báo (link mở ra 404)
    const room = await this.prisma.db.room.findFirst({
      where: { id: p.roomId, deletedAt: null },
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

  /** D-71: vào nhóm ngay → thông báo chào (tự tham gia, lúc đăng ký, migration tự duyệt) */
  async groupJoined(p: OutboxPayload<'group.joined'>): Promise<void> {
    const g = await this.prisma.db.group.findUnique({
      where: { id: p.groupId },
      select: { name: true },
    });
    if (!g) return;
    await this.notifications.notify([
      {
        userId: p.userId,
        type: 'group',
        title: `Chào mừng bạn đến với ${g.name}!`,
        body: 'Hãy vào phòng Chung để giới thiệu bản thân.',
        link: `/chat/${p.groupId}`,
      },
    ]);
  }

  /** NA-12: gán hàng loạt — mỗi cặp (thành viên, nhóm mới) 1 thông báo; 1 query tên nhóm, 1 lô ghi */
  async membersAssigned(p: OutboxPayload<'group.members_assigned'>): Promise<void> {
    const groups = await this.prisma.db.group.findMany({
      where: { id: { in: [...new Set(p.pairs.map((x) => x.groupId))] } },
      select: { id: true, name: true },
    });
    const name = new Map(groups.map((g) => [g.id, g.name]));
    await this.notifications.notify(
      p.pairs.flatMap(({ userId, groupId }) => {
        const g = name.get(groupId);
        return g
          ? [
              {
                userId,
                type: 'group' as const,
                title: `Bạn đã được thêm vào ${g}`,
                body: 'Hãy vào phòng Chung để làm quen.',
                link: `/chat/${groupId}`,
              },
            ]
          : [];
      }),
    );
  }

  /** NA-29: chủ nhóm mới (tạo nhóm / đổi chủ) */
  async ownerChanged(p: OutboxPayload<'group.owner_changed'>): Promise<void> {
    const g = await this.prisma.db.group.findUnique({
      where: { id: p.groupId },
      select: { name: true },
    });
    if (!g) return;
    await this.notifications.notify([
      {
        userId: p.userId,
        type: 'group',
        title: `Bạn là chủ nhóm ${g.name}`,
        body: 'Bạn duyệt yêu cầu tham gia và ghim tin trong nhóm.',
        link: `/chat/${p.groupId}`,
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
        ...(p.reportId ? { id: moderationWarningId(p.reportId) } : {}),
        userId: p.userId,
        ...moderationWarningContent(room),
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
        // BUG-023: Portal không có `/membership`; phí đã ghi nhận → Bảng điều khiển
        link: '/dashboard',
      },
    ]);
  }

  /** Nhắc phí (NA-04, §12): thông báo chuông, mở trang thanh toán phí */
  async feeReminded(p: OutboxPayload<'membership_fee.reminded'>): Promise<void> {
    await this.notifications.notify(
      p.items.map((i) => ({
        userId: i.userId,
        type: 'membership' as const,
        title: i.title ?? 'Nhắc phí thành viên',
        body: i.text,
        link: '/membership/pay',
      })),
    );
  }

  /** Đăng ký sự kiện (B31) — nhắc giờ diễn ra; người đã huỷ trước khi relay chạy thì không báo */
  async eventRegistered(p: OutboxPayload<'event.registered'>): Promise<void> {
    const ev = await this.prisma.db.event.findUnique({
      where: { id: p.eventId },
      select: {
        title: true,
        startsAt: true,
        address: true,
        meetUrl: true,
        registrations: {
          where: { userId: p.userId, status: 'registered' },
          select: { userId: true },
        },
      },
    });
    if (!ev?.registrations.length) return;
    await this.notifications.notify([
      {
        userId: p.userId,
        type: 'event',
        title: `Đã đăng ký: ${ev.title}`,
        body: `${eventWhere(ev)}Chúng tôi sẽ nhắc bạn trước khi sự kiện bắt đầu · ${vnWhen(ev.startsAt)}`,
        link: `/events/${p.eventId}`,
      },
    ]);
  }

  /** NA-23 nhắc 24h: 1 query sự kiện + người còn `registered`, ghi 1 lô thông báo */
  async eventReminder(p: OutboxPayload<'event.reminder_due'>): Promise<void> {
    const ev = await this.prisma.db.event.findUnique({
      where: { id: p.eventId },
      select: {
        title: true,
        startsAt: true,
        address: true,
        meetUrl: true,
        registrations: { where: { status: 'registered' }, select: { userId: true } },
      },
    });
    if (!ev?.registrations.length) return;
    await this.notifications.notify(
      ev.registrations.map(({ userId }) => ({
        userId,
        type: 'event' as const,
        title: `Sắp diễn ra: ${ev.title}`,
        body: `${eventWhere(ev)}Bắt đầu lúc ${vnWhen(ev.startsAt)}`,
        link: `/events/${p.eventId}`,
      })),
    );
  }

  /** @nhắc trong bình luận phiếu YC (B46) — chỉ nhân sự được nhắc, link sang màn Admin */
  async serviceMentioned(p: OutboxPayload<'service_request.mentioned'>): Promise<void> {
    await this.notifications.notify(
      p.userIds.map((userId) => ({
        userId,
        type: 'mention' as const,
        title: `${p.by} nhắc bạn trong phiếu ${p.code}`,
        body: 'Mở phiếu yêu cầu dịch vụ để xem bình luận.',
        link: `/requests?code=${encodeURIComponent(p.code)}`,
      })),
    );
  }
}
