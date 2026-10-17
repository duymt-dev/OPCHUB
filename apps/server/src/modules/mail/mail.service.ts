import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { OutboxService } from '@/common/outbox';
import { MailRepository, type NewMail } from './mail.repository';

/**
 * Domain khác gọi `request` TRONG transaction của mình: ghi `mail_logs` + outbox `mail.requested`.
 * Relay đẩy sang queue `mail`, worker gửi qua adapter — không bao giờ gửi mail trong transaction.
 */
@Injectable()
export class MailService {
  constructor(
    private readonly repo: MailRepository,
    private readonly outbox: OutboxService,
  ) {}

  async request(tx: DbTx, mail: NewMail): Promise<string> {
    const mailLogId = await this.repo.create(tx, mail);
    await this.outbox.add(tx, 'mail.requested', { mailLogId });
    return mailLogId;
  }
}
