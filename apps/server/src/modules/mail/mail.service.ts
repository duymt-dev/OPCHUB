import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { OutboxService } from '@/common/outbox';
import { MailRepository, type NewMail } from './mail.repository';

/**
 * Domain khác gọi `request` TRONG transaction của mình: ghi `mail_logs` + outbox `mail.requested`.
 * Relay đẩy sang queue `mail`, worker gửi qua adapter — không bao giờ gửi mail trong transaction.
 * `priority` (NA-05) theo loại thư đi kèm sự kiện để job BullMQ xếp đúng thứ tự.
 */
@Injectable()
export class MailService {
  constructor(
    private readonly repo: MailRepository,
    private readonly outbox: OutboxService,
  ) {}

  async request(tx: DbTx, mail: NewMail): Promise<string> {
    const { id, priority } = await this.repo.create(tx, mail);
    await this.outbox.add(tx, 'mail.requested', { mailLogId: id, priority });
    return id;
  }

  async requestOnce(tx: DbTx, id: string, mail: NewMail): Promise<void> {
    if (await this.repo.createOnce(tx, id, mail)) {
      await this.outbox.add(tx, 'mail.requested', { mailLogId: id });
    }
  }

  /** Nhiều thư một lần (nhắc phí hàng loạt): 1 INSERT mail_logs + 1 INSERT outbox */
  async requestMany(tx: DbTx, mails: readonly NewMail[]): Promise<number> {
    const rows = await this.repo.createMany(tx, mails);
    await this.outbox.addMany(
      tx,
      'mail.requested',
      rows.map((r) => ({ mailLogId: r.id, priority: r.priority })),
    );
    return rows.length;
  }
}
