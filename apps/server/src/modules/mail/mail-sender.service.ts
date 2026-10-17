import { Inject, Injectable, Logger } from '@nestjs/common';
import type { MailProvider } from '@opchub/integrations';
import { ENV, type Env } from '@/common/config';
import { MAIL } from '@/common/integrations';
import { MailRepository } from './mail.repository';

/** Worker `mail`: gửi một thư đã ghi log. Idempotent — thư không còn `queued` thì bỏ qua. */
@Injectable()
export class MailSenderService {
  private readonly logger = new Logger(MailSenderService.name);

  constructor(
    private readonly repo: MailRepository,
    @Inject(MAIL) private readonly provider: MailProvider,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async send(mailLogId: string, final: boolean, now = new Date()): Promise<void> {
    const mail = await this.repo.findQueued(mailLogId);
    if (!mail?.bodyHtml) return;
    try {
      const r = await this.provider.send({
        to: mail.to,
        subject: mail.subject,
        html: mail.bodyHtml,
        from: { name: this.env.MAIL_FROM_NAME, email: this.env.MAIL_FROM_EMAIL },
      });
      await this.repo.markSent(mail.id, r.messageId, now);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi gửi mail';
      await this.repo.recordAttempt(mail.id, msg, final);
      this.logger.warn({ mailLogId, final }, 'Gửi mail lỗi');
      throw err;
    }
  }
}
