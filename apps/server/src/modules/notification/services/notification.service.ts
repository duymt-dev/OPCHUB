import { Injectable } from '@nestjs/common';
import {
  NOTIFICATION_TYPES,
  type Notification,
  type NotificationList,
} from '@opchub/shared/api-domains';
import { UserEventsPublisher } from '@/common/realtime/user-events.publisher';
import {
  type NewNotification,
  NotificationRepository,
} from '../repositories/notification.repository';

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotifyItem = Omit<NewNotification, 'type'> & { type: NotificationType };

const isType = (t: string): t is NotificationType =>
  (NOTIFICATION_TYPES as readonly string[]).includes(t);

function toDto(r: {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  readAt: Date | null;
  createdAt: Date;
}): Notification {
  return {
    id: r.id,
    type: isType(r.type) ? r.type : 'group',
    title: r.title,
    body: r.body,
    link: r.link,
    read: r.readAt !== null,
    createdAt: r.createdAt.toISOString(),
  };
}

/**
 * Thông báo cá nhân (S-04, D-29): chỉ @nhắc, trả lời, sự kiện của chính người đó — không cho cả phòng.
 * `notify` dùng chung cho domain khác (sự kiện B31, dịch vụ B46): ghi 1 lô rồi đẩy `notification.new`.
 */
/** NA-10: giữ 50 thông báo gần nhất mỗi người */
export const KEEP_PER_USER = 50;

@Injectable()
export class NotificationService {
  constructor(
    private readonly repo: NotificationRepository,
    private readonly events: UserEventsPublisher,
  ) {}

  async list(userId: string, cursor: string | undefined, size: number): Promise<NotificationList> {
    const [rows, unread] = await Promise.all([
      this.repo.page(userId, cursor, size),
      this.repo.unreadCount(userId),
    ]);
    const items = rows.slice(0, size).map(toDto);
    return {
      items,
      nextCursor: rows.length > size ? (items.at(-1)?.id ?? null) : null,
      unread,
    };
  }

  async markRead(userId: string, ids: readonly string[] | undefined): Promise<{ unread: number }> {
    await this.repo.markRead(userId, ids);
    return { unread: await this.repo.unreadCount(userId) };
  }

  /**
   * Gọi từ consumer outbox (sự kiện nghiệp vụ đã commit): 1 INSERT cho cả lô rồi đẩy realtime.
   * Consumer chạy lại (at-least-once) có thể tạo trùng — chấp nhận cho thông báo (không phải tiền).
   */
  async notify(items: readonly NotifyItem[]): Promise<void> {
    if (!items.length) return;
    const rows = await this.repo.createMany(items);
    await this.repo.trim(
      rows.map((r) => r.userId),
      KEEP_PER_USER,
    );
    await Promise.all(rows.map((r) => this.events.publish(r.userId, 'notification.new', toDto(r))));
  }
}
