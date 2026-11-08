import { Injectable } from '@nestjs/common';
import { isFeeUsable, scoreNeedMatch } from '@opchub/shared';
import type { OutboxPayload } from '@opchub/shared/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { NotificationService } from '@/modules/notification';
import { NeedMatchAudienceRepository } from '../repositories/need-match-audience.query';

@Injectable()
export class NeedMatchNotifyHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: NeedMatchAudienceRepository,
    private readonly notifications: NotificationService,
    private readonly redis: RedisService,
  ) {}

  async published(p: OutboxPayload<'need.published'>, now = new Date()) {
    const need = await this.repo.need(p.needId, now);
    if (!need) return;
    const audience = (await this.repo.audience(need, now))
      .filter(
        (store) =>
          isFeeUsable({ status: store.feeStatus, validUntil: store.validUntil }, now) &&
          scoreNeedMatch(store, need).score >= 30,
      )
      .slice(0, 500);
    const rows = await this.prisma.db.$transaction(async (tx) => {
      const claimed = await this.repo.claim(
        tx,
        need.id,
        audience.map((r) => r.userId),
      );
      return this.notifications.persist(
        tx,
        claimed.map(({ userId }) => ({
          id: `need-match-${need.id}-${userId}`,
          userId,
          type: 'system',
          push: 'need',
          title: 'Nhu cầu phù hợp với gian hàng của bạn',
          body: `${need.title.slice(0, 80)} · ${need.province}`,
          link: '/needs',
        })),
      );
    });
    // Invalidate all eligible recipients on replay too: an earlier cache DEL may have failed.
    if (audience.length)
      await this.redis.client.del(...audience.map((r) => `need-matches:${r.userId}`));
    await this.notifications.publish(rows);
  }
}
