import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { DbTx } from '@opchub/db';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { PushIntent } from '../domain/push-kind';
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
export type NotifyItem = Omit<NewNotification, 'type'> & PushIntent & { type: NotificationType };
type CreatedNotification = Awaited<ReturnType<NotificationRepository['createMany']>>[number];

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
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
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
   * Consumer cần chống trùng phải truyền `id` ổn định; repository bỏ qua ID đã ghi khi retry.
   * Consumer không truyền ID vẫn tạo một thông báo mới cho mỗi lần gọi.
   */
  async notify(items: readonly NotifyItem[]): Promise<void> {
    if (!items.length) return;
    const rows = await this.prisma.db.$transaction((tx) => this.persist(tx, items));
    await this.publish(rows);
  }

  /** Domain callers can atomically claim their ledger and persist, then publish AFTER commit. */
  async persist(tx: DbTx, items: readonly NotifyItem[]): Promise<CreatedNotification[]> {
    if (!items.length) return [];
    // Leave untagged IDs to Prisma's existing ordered UUID7 default.
    const prepared = items.map((item) =>
      item.push ? { ...item, id: item.id ?? randomUUID() } : item,
    );
    const tagged = prepared.filter((item) => item.push);
    const existing = tagged.length
      ? await tx.pushDispatch.findMany({
          where: { notificationId: { in: tagged.flatMap((item) => (item.id ? [item.id] : [])) } },
          select: { notificationId: true },
        })
      : [];
    const old = new Set(existing.map((r) => r.notificationId));
    const data = prepared
      .filter((item) => !old.has(item.id ?? ''))
      .map((item) => ({
        ...(item.id ? { id: item.id } : {}),
        userId: item.userId,
        type: item.type,
        title: item.title,
        body: item.body,
        link: item.link,
      }));
    if (!data.length) return [];
    const rows = await this.repo.createMany(data, tx);
    const metadata = new Map(prepared.map((item) => [item.id, item]));
    const intents = rows.flatMap((row) => {
      const item = metadata.get(row.id);
      return item?.push
        ? [{ notificationId: row.id, kind: item.push, realm: item.realm ?? 'member' }]
        : [];
    });
    if (intents.length) {
      const dispatches = await tx.pushDispatch.createManyAndReturn({
        data: intents,
        skipDuplicates: true,
        select: { notificationId: true },
      });
      const batches = Array.from({ length: Math.ceil(dispatches.length / 500) }, (_, index) => ({
        notificationIds: dispatches
          .slice(index * 500, (index + 1) * 500)
          .map((r) => r.notificationId),
      }));
      await this.outbox.addMany(tx, 'push.requested', batches);
    }
    return rows;
  }

  async publish(rows: readonly CreatedNotification[]): Promise<void> {
    if (!rows.length) return;
    await this.repo.trim(
      rows.map((r) => r.userId),
      KEEP_PER_USER,
    );
    await Promise.all(rows.map((r) => this.events.publish(r.userId, 'notification.new', toDto(r))));
  }
}
