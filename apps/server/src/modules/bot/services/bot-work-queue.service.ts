import { Inject, Injectable } from '@nestjs/common';
import { botSettingsSchema } from '@opchub/shared/api-domains';
import { QUEUES } from '@opchub/shared/queues';
import { ENV, type Env } from '@/common/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { QueueService } from '@/common/queue';
import { PersonaReplyContextService } from '@/modules/chat';
import { lockBotExecution } from '../repositories/execution-lock';
import { BotControlFenceService } from './bot-control-fence.service';

/** Both producers revalidate under the kill-switch lock; no per-turn SQL loop. */
@Injectable()
export class BotWorkQueueService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly chat: PersonaReplyContextService,
    private readonly fence: BotControlFenceService,
  ) {}

  async turns(requests: { threadId: string; turn: number }[]): Promise<void> {
    if (!this.env.FEATURE_BOTS || !requests.length) return;
    await this.prisma.db.$transaction(async (tx) => {
      await lockBotExecution(tx);
      // Ordinary enabled=false is a resumable pause: keep the existing outbox -> worker
      // contract. Emergency stop instead makes every old thread terminal under this lock.
      // The worker always rechecks current settings before generation/publication.
      const rows = await tx.botThread.findMany({
        where: {
          id: { in: requests.map((r) => r.threadId) },
          status: { in: ['scheduled', 'running'] },
          nextAt: { not: null },
          OR: [{ scriptId: null }, { script: { enabled: true } }],
        },
        select: { id: true, cursor: true, nextAt: true },
      });
      const wanted = new Set(requests.map((r) => `${r.threadId}:${r.turn}`));
      const timestamp = await this.fence.queueTimestamp(tx);
      await Promise.all(
        rows
          .filter((r) => wanted.has(`${r.id}:${r.cursor}`))
          .map((r) =>
            this.queue.add(
              QUEUES.bot,
              'postTurn',
              { threadId: r.id, turn: r.cursor },
              {
                jobId: `bot-${r.id}-${r.cursor}`,
                delay: Math.max(0, (r.nextAt?.getTime() ?? 0) - Date.now()),
                timestamp,
                removeOnComplete: true,
                attempts: 3,
                backoff: { type: 'exponential', delay: 30000 },
              },
            ),
          ),
      );
    });
  }

  async reply(messageId: string): Promise<void> {
    if (!this.env.FEATURE_BOTS) return;
    await this.prisma.db.$transaction(async (tx) => {
      await lockBotExecution(tx);
      const setting = await tx.appSetting.findUniqueOrThrow({
        where: { key: 'bot' },
        select: { value: true },
      });
      const settings = botSettingsSchema.parse(setting.value);
      if (!settings.enabled || !settings.replyToMembers) return;
      const source = await this.chat.trigger(tx, messageId);
      if (!source || !(await this.fence.allowsReply(tx, source.createdAt))) return;
      await this.queue.add(
        QUEUES.bot,
        'reply',
        { messageId },
        {
          jobId: `bot-reply-${messageId}`,
          timestamp: await this.fence.queueTimestamp(tx),
          attempts: 3,
          backoff: { type: 'exponential', delay: 30000 },
        },
      );
    });
  }
}
