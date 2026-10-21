import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { IntegrationError } from '@opchub/integrations';
import { QUEUES } from '@opchub/shared/queues';
import { UnrecoverableError } from 'bullmq';
import { OutboxRelayService } from '@/common/outbox';
import { WorkerFactory } from '@/common/queue';
import {
  BotRunnerService,
  BotSchedulerService,
  BotReplyService,
  BotWorkQueueService,
  BotEmergencyCleanupService,
  BotHidePublicationService,
} from '@/modules/bot';

@Injectable()
export class BotProcessor implements OnApplicationBootstrap {
  constructor(
    private readonly relay: OutboxRelayService,
    private readonly workers: WorkerFactory,
    private readonly scheduler: BotSchedulerService,
    private readonly runner: BotRunnerService,
    private readonly replies: BotReplyService,
    private readonly work: BotWorkQueueService,
    private readonly cleanup: BotEmergencyCleanupService,
    private readonly hidden: BotHidePublicationService,
  ) {}

  onApplicationBootstrap(): void {
    this.relay.register('bot.messages_hidden', (payload) => this.hidden.handle(payload));
    this.relay.register('bot.emergency_stopped', ({ at }) => this.cleanup.handle(at));
    this.relay.register('chat.member_sent', (payload) => this.work.reply(payload.messageId));
    this.relay.register('bot.turn_due', (payload) =>
      this.work.turns([{ threadId: payload.threadId, turn: payload.turn }]),
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
