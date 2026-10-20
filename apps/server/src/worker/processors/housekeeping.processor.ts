import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { QUEUES } from '@opchub/shared/queues';
import { WorkerFactory } from '@/common/queue';
import { HousekeepingService } from '@/modules/system';

/** NA-13: lịch 02:00 VN `scheduler.housekeeping` (concurrency 1) */
@Injectable()
export class HousekeepingProcessor implements OnApplicationBootstrap {
  constructor(
    private readonly workers: WorkerFactory,
    private readonly housekeeping: HousekeepingService,
  ) {}

  onApplicationBootstrap(): void {
    this.workers.start(
      QUEUES.scheduler,
      {
        housekeeping: async () => {
          await this.housekeeping.run();
        },
      },
      1,
    );
  }
}
