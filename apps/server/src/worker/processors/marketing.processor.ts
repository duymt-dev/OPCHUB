import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { QUEUES } from '@opchub/shared/queues';
import { OutboxRelayService } from '@/common/outbox';
import { QueueService, WorkerFactory } from '@/common/queue';
import { MAIL_PRIORITY } from '@/modules/mail';
import { CampaignSenderService } from '@/modules/marketing';

/** NA-05: lô chiến dịch xếp sau thư OTP / giao dịch đang chờ */
const BATCH_PRIORITY = MAIL_PRIORITY.campaign;

/**
 * Chiến dịch (B42): outbox `campaign.send` → job `mail.campaignBatch`; mỗi job xếp một lô rồi
 * tự xếp lô sau (jobId theo con trỏ để không trùng). Chiến dịch bị dừng (BUG-036) → `runBatch`
 * không thấy `sending` → không xếp lô sau.
 * D-73 (TIP-V4-606): gỡ lịch `scheduler.campaignsDue` (chiến dịch hẹn giờ không tự chạy); giữ
 * consumer outbox + lô để sự kiện đã ghi không bị nuốt (M1, Q-V4-606-3).
 */
@Injectable()
export class MarketingProcessor implements OnApplicationBootstrap {
  constructor(
    private readonly relay: OutboxRelayService,
    private readonly queue: QueueService,
    private readonly workers: WorkerFactory,
    private readonly sender: CampaignSenderService,
  ) {}

  onApplicationBootstrap(): void {
    this.relay.register('campaign.send', (p) =>
      this.queue.add(QUEUES.mail, 'campaignBatch', p, {
        jobId: `campaign-${p.campaignId}-0`,
        priority: BATCH_PRIORITY,
      }),
    );
    this.workers.start(
      QUEUES.mail,
      {
        campaignBatch: async (d, job) => {
          const r = await this.sender.runBatch(d.campaignId);
          if (r.more) {
            await this.queue.add(QUEUES.mail, 'campaignBatch', d, {
              jobId: `campaign-${d.campaignId}-${Date.now()}-${job.id ?? ''}`,
              priority: BATCH_PRIORITY,
            });
          }
        },
      },
      1,
    );
  }
}
