import { Inject, Injectable, Logger } from '@nestjs/common';
import { mailRetryDelay } from '@opchub/shared/queues';
import { ENV, type Env } from '@/common/config';
import { DailyQuota } from './daily-quota';
import { URGENT_PRIORITY } from './mail-priority';
import { MailRepository } from './mail.repository';
import { SmtpTransport } from './smtp-transport';
import { UnsubscribeToken } from './unsubscribe-token';

export type SendResult = { status: 'sent' | 'skipped' } | { status: 'deferred'; until: Date };

/**
 * Worker `mail`: gửi một thư đã ghi log. Idempotent — thư không còn `queued` (đã gửi, lỗi, chiến
 * dịch bị dừng) thì bỏ qua. NA-05: hết hạn mức ngày → `deferred` (OTP: nửa đêm VN; chiến dịch:
 * 08:00 VN ngày sau), không tính lần thử. Lỗi → ghi lần thử + mốc thử lại 1/5/15 phút.
 * BUG-036: thư chiến dịch tới người đã huỷ nhận → huỷ; còn lại kèm `List-Unsubscribe`.
 */
@Injectable()
export class MailSenderService {
  private readonly logger = new Logger(MailSenderService.name);

  constructor(
    private readonly repo: MailRepository,
    private readonly transport: SmtpTransport,
    private readonly quota: DailyQuota,
    private readonly unsub: UnsubscribeToken,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async send(mailLogId: string, final: boolean, now = new Date()): Promise<SendResult> {
    const mail = await this.repo.findQueued(mailLogId);
    if (!mail?.bodyHtml) return { status: 'skipped' };
    const campaign = mail.kind === 'campaign';
    if (campaign && (await this.repo.isSuppressed(mail.to))) {
      await this.repo.cancelQueued(mail.id, 'Người nhận đã huỷ nhận email chiến dịch');
      return { status: 'skipped' };
    }
    const route = await this.transport.resolve(now.getTime());
    if (route.dailyLimit !== null) {
      const q = await this.quota.take(route.dailyLimit, now, {
        priority: mail.priority,
        reserve: this.env.MAIL_OTP_RESERVE,
      });
      if (!q.ok) {
        await this.repo.defer(mail.id, q.retryAt);
        if (mail.priority <= URGENT_PRIORITY) {
          this.logger.warn({ mailLogId, retryAt: q.retryAt }, 'Hết hạn mức ngày cả phần dành OTP');
        }
        return { status: 'deferred', until: q.retryAt };
      }
    }
    try {
      const r = await route.provider.send({
        to: mail.to,
        subject: mail.subject,
        html: mail.bodyHtml,
        from: route.from,
        ...(route.replyTo ? { replyTo: route.replyTo } : {}),
        ...(campaign ? { headers: this.unsub.headers(mail.to) } : {}),
      });
      await this.repo.markSent(mail.id, r.messageId, now);
      return { status: 'sent' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi gửi mail';
      const next = new Date(now.getTime() + mailRetryDelay(mail.attempts + 1));
      const urgent = mail.priority <= URGENT_PRIORITY;
      await this.repo.recordAttempt(mail.id, msg, final, next, urgent);
      this.logger.warn({ mailLogId, final, attempt: mail.attempts + 1 }, 'Gửi mail lỗi');
      throw err;
    }
  }
}
