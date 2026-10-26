import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { QUEUES } from '@opchub/shared/queues';
import { WorkerFactory } from '@/common/queue';
import { FundraisingSchedulerService } from '@/modules/project';

/** V4-610 (D-82): `scheduler.fundraisingStatus` hằng ngày — Gói Gọi vốn hết hạn + nhắc gia hạn */
@Injectable()
export class FundraisingProcessor implements OnApplicationBootstrap {
  constructor(
    private readonly workers: WorkerFactory,
    private readonly scheduler: FundraisingSchedulerService,
  ) {}

  onApplicationBootstrap(): void {
    this.workers.start(
      QUEUES.scheduler,
      { fundraisingStatus: async () => void (await this.scheduler.run()) },
      1,
    );
  }
}
