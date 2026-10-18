import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { QUEUES } from '@opchub/shared/queues';
import { DelayedError } from 'bullmq';
import { OutboxRelayService } from '@/common/outbox';
import { QueueService, WorkerFactory } from '@/common/queue';
import { DEFAULT_PRIORITY, MailSenderService } from '@/modules/mail';

/**
 * Outbox `mail.requested` → queue `mail` (jobId = mailLogId: relay gọi lại không tạo job trùng)
 * → MailSenderService gửi qua adapter. NA-05: `priority` BullMQ theo loại thư (OTP 1 … chiến dịch
 * 5, số nhỏ chạy trước); lỗi thử lại 1/5/15 phút (4 lần gửi) rồi `mail_logs.status = failed`.
 * Vượt hạn mức ngày → dời job (OTP nửa đêm VN, chiến dịch 08:00 VN ngày sau; DelayedError, không
 * tính lần thử). Lô chiến dịch (`campaignBatch`) xếp nối tiếp — mỗi chiến dịch một chuỗi job.
 */
@Injectable()
export class MailProcessor implements OnApplicationBootstrap {
  constructor(
    private readonly relay: OutboxRelayService,
    private readonly queue: QueueService,
    private readonly workers: WorkerFactory,
    private readonly sender: MailSenderService,
  ) {}

  onApplicationBootstrap(): void {
    this.relay.register('mail.requested', (p) =>
      this.queue.add(
        QUEUES.mail,
        'send',
        { mailLogId: p.mailLogId },
        { jobId: `mail-${p.mailLogId}`, priority: p.priority ?? DEFAULT_PRIORITY },
      ),
    );
    this.workers.start(QUEUES.mail, {
      send: async (data, job) => {
        const final = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
        const r = await this.sender.send(data.mailLogId, final);
        if (r.status === 'deferred' && job.token) {
          await job.moveToDelayed(r.until.getTime(), job.token);
          throw new DelayedError();
        }
      },
    });
  }
}
