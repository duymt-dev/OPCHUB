import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { QUEUES } from '@opchub/shared/queues';
import { WorkerFactory } from '@/common/queue';
import { StatsDailyService, vnYesterday } from '@/modules/reporting';

/** Lịch 00:10 VN: chụp `stats_daily` ngày vừa hết + `groups.weekly_active` (B44) */
@Injectable()
export class StatsProcessor implements OnApplicationBootstrap {
  private readonly logger = new Logger(StatsProcessor.name);

  constructor(
    private readonly workers: WorkerFactory,
    private readonly stats: StatsDailyService,
  ) {}

  onApplicationBootstrap(): void {
    this.workers.start(
      QUEUES.scheduler,
      {
        statsDaily: async (d) => {
          const day = d.day ?? vnYesterday(new Date());
          await this.stats.capture(day);
          this.logger.log({ day }, 'Đã chụp số liệu ngày');
        },
      },
      1,
    );
  }
}
