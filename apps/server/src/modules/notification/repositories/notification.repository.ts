import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface NewNotification {
  userId: string;
  type: string;
  title: string;
  body: string;
  link: string;
}

const SELECT = {
  id: true,
  type: true,
  title: true,
  body: true,
  link: true,
  readAt: true,
  createdAt: true,
} as const;

/** Hộp thư theo người (D-29) — keyset (user_id, created_at DESC, id DESC); đếm chưa đọc partial `notifications_unread` */
@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async page(userId: string, cursor: string | undefined, size: number) {
    const anchor = cursor
      ? await this.prisma.db.notification.findFirst({
          where: { id: cursor, userId },
          select: { id: true, createdAt: true },
        })
      : null;
    return this.prisma.db.notification.findMany({
      where: {
        userId,
        ...(anchor
          ? {
              OR: [
                { createdAt: { lt: anchor.createdAt } },
                { createdAt: anchor.createdAt, id: { lt: anchor.id } },
              ],
            }
          : {}),
      },
      select: SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: size + 1,
    });
  }

  unreadCount(userId: string): Promise<number> {
    return this.prisma.db.notification.count({ where: { userId, readAt: null } });
  }

  /** Chỉ dòng của chính người gọi (ids người khác bị bỏ qua) */
  async markRead(userId: string, ids: readonly string[] | undefined): Promise<void> {
    await this.prisma.db.notification.updateMany({
      where: { userId, readAt: null, ...(ids ? { id: { in: [...ids] } } : {}) },
      data: { readAt: new Date() },
    });
  }

  /** Một lệnh cho cả lô (luật 7: không insert trong vòng lặp) */
  createMany(rows: readonly NewNotification[]) {
    return this.prisma.db.notification.createManyAndReturn({
      data: [...rows],
      select: { ...SELECT, userId: true },
    });
  }
}
