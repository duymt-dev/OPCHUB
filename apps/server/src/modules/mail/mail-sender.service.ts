import { Injectable, Logger } from '@nestjs/common';
import { DailyQuota } from './daily-quota';
import { MailRepository } from './mail.repository';
import { SmtpTransport } from './smtp-transport';

export type SendResult = { status: 'sent' | 'skipped' } | { status: 'deferred'; until: Date };

/**
 * Worker `mail`: gửi một thư đã ghi log. Idempotent — thư không còn `queued` thì bỏ qua.
 * Hết hạn mức ngày của SMTP → `deferred` (processor dời job tới nửa đêm VN, không tính lần thử).
 */
@Injectable()
export class MailSenderService {
  private readonly logger = new Logger(MailSenderService.name);

  constructor(
    private readonly repo: MailRepository,
    private readonly transport: SmtpTransport,
    private readonly quota: DailyQuota,
  ) {}

  async send(mailLogId: string, final: boolean, now = new Date()): Promise<SendResult> {
    const mail = await this.repo.findQueued(mailLogId);
    if (!mail?.bodyHtml) return { status: 'skipped' };
    const route = await this.transport.resolve(now.getTime());
    if (route.dailyLimit !== null) {
      const q = await this.quota.take(route.dailyLimit, now);
      if (!q.ok) return { status: 'deferred', until: q.retryAt };
    }
    try {
      const r = await route.provider.send({
        to: mail.to,
        subject: mail.subject,
        html: mail.bodyHtml,
        from: route.from,
        ...(route.replyTo ? { replyTo: route.replyTo } : {}),
      });
      await this.repo.markSent(mail.id, r.messageId, now);
      return { status: 'sent' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi gửi mail';
      await this.repo.recordAttempt(mail.id, msg, final);
      this.logger.warn({ mailLogId, final }, 'Gửi mail lỗi');
      throw err;
    }
  }
}
