import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { QUEUES } from '@opchub/shared/queues';
import { OutboxRelayService } from '@/common/outbox';
import { QueueService, WorkerFactory } from '@/common/queue';
import { MailSenderService } from '@/modules/mail';

/**
 * Outbox `mail.requested` → queue `mail` (jobId = mailLogId: relay gọi lại không tạo job trùng)
 * → MailSenderService gửi qua adapter. Hết 5 lần thử → `mail_logs.status = failed`.
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
      this.queue.add(QUEUES.mail, 'send', p, { jobId: `mail-${p.mailLogId}` }),
    );
    this.workers.start(QUEUES.mail, {
      send: (data, job) => {
        const final = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
        return this.sender.send(data.mailLogId, final);
      },
    });
  }
}
