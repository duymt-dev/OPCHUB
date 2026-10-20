import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { IntegrationError } from '@opchub/integrations';
import { QUEUES } from '@opchub/shared/queues';
import { UnrecoverableError } from 'bullmq';
import { OutboxRelayService } from '@/common/outbox';
import { QueueService, WorkerFactory } from '@/common/queue';
import { BotRunnerService, BotSchedulerService, BotReplyService } from '@/modules/bot';

@Injectable()
export class BotProcessor implements OnApplicationBootstrap {
  constructor(
    private readonly relay: OutboxRelayService,
    private readonly queue: QueueService,
    private readonly workers: WorkerFactory,
    private readonly scheduler: BotSchedulerService,
    private readonly runner: BotRunnerService,
    private readonly replies: BotReplyService,
  ) {}

  onApplicationBootstrap(): void {
    this.relay.register('chat.member_sent', (payload) =>
      this.queue.add(QUEUES.bot, 'reply', payload, {
        jobId: `bot-reply-${payload.messageId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 30000 },
      }),
    );
    this.relay.register('bot.turn_due', (payload) =>
      this.queue.add(
        QUEUES.bot,
        'postTurn',
        { threadId: payload.threadId, turn: payload.turn },
        {
          jobId: `bot-${payload.threadId}-${payload.turn}`,
          delay: Math.max(0, Date.parse(payload.at) - Date.now()),
          removeOnComplete: true,
          attempts: 3,
          backoff: { type: 'exponential', delay: 30000 },
        },
      ),
    );
    this.workers.start(
      QUEUES.bot,
      {
        tick: async () => {
          await this.scheduler.tick();
        },
        reply: async (payload) => {
          await this.replies.handle(payload.messageId);
        },
        postTurn: async (payload) => {
          try {
            await this.runner.postTurn(payload.threadId, payload.turn);
          } catch (error) {
            if (error instanceof IntegrationError && !error.retryable)
              throw new UnrecoverableError(error.message);
            throw error;
          }
        },
      },
      1,
    );
  }
}
