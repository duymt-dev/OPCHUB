import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { QUEUES } from '@opchub/shared/queues';
import { OutboxRelayService } from '@/common/outbox';
import { QueueService, WorkerFactory } from '@/common/queue';
import { PushDispatchService } from '@/modules/notification';

@Injectable()
export class PushProcessor implements OnApplicationBootstrap {
  constructor(
    private readonly relay: OutboxRelayService,
    private readonly queues: QueueService,
    private readonly workers: WorkerFactory,
    private readonly push: PushDispatchService,
  ) {}
  onApplicationBootstrap() {
    this.relay.register('push.requested', async ({ notificationIds }) => {
      const digest = createHash('sha256')
        .update([...notificationIds].sort().join('\n'))
        .digest('hex');
      await this.queues.add(QUEUES.push, 'send', { notificationIds }, { jobId: `push-${digest}` });
    });
    this.workers.start(
      QUEUES.push,
      {
        send: ({ notificationIds }, job) =>
          this.push.send(notificationIds, job.id, job.attemptsStarted),
      },
      1,
    );
  }
}
