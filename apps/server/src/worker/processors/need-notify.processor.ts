import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { QUEUES } from '@opchub/shared/queues';
import { OutboxRelayService } from '@/common/outbox';
import { QueueService, WorkerFactory } from '@/common/queue';
import { NeedMatchNotifyHandler, StoreDigestService } from '@/modules/local-business';

@Injectable()
export class NeedNotifyProcessor implements OnApplicationBootstrap {
  constructor(
    private readonly relay: OutboxRelayService,
    private readonly queues: QueueService,
    private readonly workers: WorkerFactory,
    private readonly needs: NeedMatchNotifyHandler,
    private readonly stores: StoreDigestService,
  ) {}
  onApplicationBootstrap() {
    this.relay.register('need.published', (p) => this.needs.published(p));
    this.relay.registerWithId('store.digest_due', async (p, id) => {
      await this.queues.add(QUEUES.scheduler, 'storeDigest', p, { jobId: `store-digest-${id}` });
    });
    this.workers.start(
      QUEUES.scheduler,
      {
        storeDigest: async ({ day }) => {
          await this.stores.run(day);
        },
      },
      1,
    );
  }
}
