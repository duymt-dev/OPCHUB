import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { QUEUES } from '@opchub/shared/queues';
import { OutboxRelayService } from '@/common/outbox';
import { QueueService, WorkerFactory } from '@/common/queue';
import { PersonaTurnPublisher } from '@/modules/chat';

/** Bot queue publication boundary; scheduler/runner handlers register separately. */
@Injectable()
export class BotPublicationProcessor implements OnApplicationBootstrap {
  constructor(
    private readonly relay: OutboxRelayService,
    private readonly queue: QueueService,
    private readonly workers: WorkerFactory,
    private readonly publisher: PersonaTurnPublisher,
  ) {}

  onApplicationBootstrap(): void {
    this.relay.register('bot.turn_posted', (payload) =>
      this.queue.add(QUEUES.bot, 'publishTurn', payload, {
        jobId: `bot-publish-${payload.messageId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      }),
    );
    this.workers.start(
      QUEUES.bot,
      {
        publishTurn: async (payload) => {
          await this.publisher.publish(payload.messageId);
        },
      },
      1,
    );
  }
}
