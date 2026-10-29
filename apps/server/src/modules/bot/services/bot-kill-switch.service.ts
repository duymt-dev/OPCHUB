import { BotReplyProgressService } from '../replies/bot-reply-progress.service';
import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { botSettingsSchema } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import { OutboxService } from '@/common/outbox';
import { AppSettingsService } from '@/modules/settings';
import { canBotThreadTransition } from '../domain/bot-thread-status';
import { lockBotExecution } from '../repositories/execution-lock';
import { type Actor, BotCatalogService } from './bot-catalog.service';
import { BotControlFenceService } from './bot-control-fence.service';

@Injectable()
export class BotKillSwitchService {
  constructor(
    private readonly replyProgress: BotReplyProgressService,
    private readonly prisma: PrismaService,
    private readonly catalog: BotCatalogService,
    private readonly fence: BotControlFenceService,
    private readonly outbox: OutboxService,
    private readonly settings: AppSettingsService,
  ) {}

  async stop(actor: Actor) {
    const result = await this.prisma.db.$transaction(async (tx) => {
      await lockBotExecution(tx);
      // Sample after acquiring the same lock as admission, publication and producers.
      const at = new Date();
      const current = await tx.appSetting.findUniqueOrThrow({
        where: { key: 'bot' },
        select: { value: true },
      });
      const value = { ...botSettingsSchema.parse(current.value), enabled: false };
      await tx.appSetting.update({ where: { key: 'bot' }, data: { value } });
      await this.fence.stop(tx, at);
      const active = (['scheduled', 'running'] as const).filter((s) =>
        canBotThreadTransition(s, 'done'),
      );
      const stopped = await tx.botThread.updateMany({
        where: { status: { in: active } },
        data: { status: 'done', nextAt: null },
      });
      await this.replyProgress.stopAll(tx);
      const stopId = randomUUID();
      await this.catalog.log(
        tx,
        actor,
        'bot.emergency_stop',
        'bot_settings',
        'bot',
        `Tắt khẩn cấp bot; dừng ${stopped.count} hội thoại`,
      );
      await this.outbox.add(tx, 'bot.emergency_stopped', { stopId, at: at.toISOString() });
      return { enabled: false as const, stopped: stopped.count };
    });
    // The durable consumer also invalidates this cache if this process dies after commit.
    await this.settings.invalidate('bot');
    return result;
  }
}
