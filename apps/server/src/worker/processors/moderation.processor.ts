import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { QUEUES } from '@opchub/shared/queues';
import { WorkerFactory } from '@/common/queue';
import { ReportService } from '@/modules/moderation';

/** Job `moderation.keywordHit` (S-08): tạo ca `auto` cho tin trúng từ khoá */
@Injectable()
export class ModerationProcessor implements OnApplicationBootstrap {
  constructor(
    private readonly workers: WorkerFactory,
    private readonly reports: ReportService,
  ) {}

  onApplicationBootstrap(): void {
    this.workers.start(QUEUES.moderation, {
      keywordHit: (d) => this.reports.keywordHit(d.messageId, d.hit),
    });
  }
}
