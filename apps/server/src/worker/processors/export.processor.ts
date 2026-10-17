import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { QUEUES } from '@opchub/shared/queues';
import { OutboxRelayService } from '@/common/outbox';
import { QueueService, WorkerFactory } from '@/common/queue';
import { ExportService } from '@/modules/export';

/** Outbox `export.requested` → queue `export` (jobId = id job, không trùng) → dựng CSV */
@Injectable()
export class ExportProcessor implements OnApplicationBootstrap {
  constructor(
    private readonly relay: OutboxRelayService,
    private readonly queue: QueueService,
    private readonly workers: WorkerFactory,
    private readonly exports: ExportService,
  ) {}

  onApplicationBootstrap(): void {
    this.relay.register('export.requested', (p) =>
      this.queue.add(QUEUES.export, 'run', p, { jobId: `export-${p.exportJobId}` }),
    );
    this.workers.start(QUEUES.export, { run: (d) => this.exports.run(d.exportJobId) }, 2);
  }
}
