import { Injectable } from '@nestjs/common';
import { isFeeUsable } from '@opchub/shared';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationService } from '@/modules/notification';
import { AppSettingsService } from '@/modules/settings';
import { StoreDigestRepository } from '../repositories/store-digest.query';

const yesterdayVn = (now: Date) =>
  new Date(now.getTime() + 7 * 3600000 - 86400000).toISOString().slice(0, 10);
/** One 1000-store page per job. Cursor, notifications and durable continuation commit together. */
@Injectable()
export class StoreDigestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: StoreDigestRepository,
    private readonly settings: AppSettingsService,
    private readonly notifications: NotificationService,
    private readonly outbox: OutboxService,
  ) {}

  async run(day?: string, now = new Date()) {
    if (!(await this.settings.app()).push.store) return 0;
    const target = day ?? yesterdayVn(now);
    const rows = await this.prisma.db.$transaction(async (tx) => {
      const run = await this.repo.lock(tx, target);
      if (!run || run.completedAt) return [];
      const page = await this.repo.page(tx, target, run.cursor, now);
      const items = page.filter((r) =>
        isFeeUsable({ status: r.feeStatus, validUntil: r.validUntil }, now),
      );
      const notifications = await this.notifications.persist(
        tx,
        items.map((r) => ({
          id: `store-digest-${target}-${r.id}`,
          userId: r.userId,
          type: 'system',
          push: 'store',
          title: 'Gian hàng hôm qua',
          body: `${r.views} lượt xem`,
          link: '/stores/mine',
        })),
      );
      const completed = page.length < 1000;
      await this.repo.advance(tx, target, page.at(-1)?.id ?? run.cursor, completed);
      if (!completed) await this.outbox.add(tx, 'store.digest_due', { day: target });
      return notifications;
    });
    await this.notifications.publish(rows);
    return rows.length;
  }
}
