import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { QUEUES } from '@opchub/shared/queues';
import { WorkerFactory } from '@/common/queue';
import { ReportService, AiModerationService } from '@/modules/moderation';

/** Job `moderation.keywordHit` (S-08): tạo ca `auto` cho tin trúng từ khoá (V4-612: ẩn + tính vi phạm) */
@Injectable()
export class ModerationProcessor implements OnApplicationBootstrap {
  constructor(
    private readonly workers: WorkerFactory,
    private readonly reports: ReportService,
    private readonly ai: AiModerationService,
  ) {}

  onApplicationBootstrap(): void {
    this.workers.start(QUEUES.moderation, {
      aiClassify: (d) => this.ai.classify(d.messageId),
      keywordHit: (d) => this.reports.keywordHit(d.messageId, d.hit),
    });
  }
}
