import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { QUEUES } from '@opchub/shared/queues';
import { OutboxRelayService } from '@/common/outbox';
import { QueueService, WorkerFactory } from '@/common/queue';
import { FeeEventsHandler, FeeSchedulerService, ReconcileService } from '@/modules/membership-fee';
import { SCHEDULES } from '../schedules';

/**
 * Worker phí: đối soát (`reconcile.match|poll`), trạng thái + nhắc phí 08:00 (`scheduler.feeStatus`),
 * consumer outbox `membership_fee.*` → Redis + realtime.
 */
@Injectable()
export class FeeProcessor implements OnApplicationBootstrap {
  private readonly logger = new Logger(FeeProcessor.name);

  constructor(
    private readonly relay: OutboxRelayService,
    private readonly queue: QueueService,
    private readonly workers: WorkerFactory,
    private readonly reconcile: ReconcileService,
    private readonly scheduler: FeeSchedulerService,
    private readonly feeEvents: FeeEventsHandler,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.relay.register('membership_fee.activated', (p) => this.feeEvents.handle(p));
    this.relay.register('membership_fee.changed', (p) => this.feeEvents.handle(p));

    this.workers.start(QUEUES.reconcile, {
      match: async (d) => {
        const r = await this.reconcile.match(d.transactionId);
        this.logger.log({ transactionId: d.transactionId, matched: r.matched }, 'Đối soát');
      },
      poll: async () => {
        await this.reconcile.poll();
      },
    });
    this.workers.start(
      QUEUES.scheduler,
      {
        feeStatus: async () => {
          const r = await this.scheduler.run();
          this.logger.log(r, 'Phí hằng ngày: chuyển trạng thái + nhắc phí');
        },
      },
      1,
    );
    for (const s of SCHEDULES) {
      await this.queue.schedule(s.queue, s.id, s.name, s.repeat);
    }
  }
}
