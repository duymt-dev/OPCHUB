import { Injectable } from '@nestjs/common';
import type { DbTx, MailKind } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface NewMail {
  to: string;
  kind: MailKind;
  subject: string;
  html: string;
  campaignId?: string;
}

/** Bảng mail_logs — chỉ domain mail ghi */
@Injectable()
export class MailRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(tx: DbTx, m: NewMail): Promise<string> {
    const row = await tx.mailLog.create({
      data: {
        to: m.to,
        kind: m.kind,
        subject: m.subject,
        bodyHtml: m.html,
        campaignId: m.campaignId ?? null,
      },
      select: { id: true },
    });
    return row.id;
  }

  findQueued(id: string) {
    return this.prisma.db.mailLog.findFirst({
      where: { id, status: 'queued' },
      select: { id: true, to: true, subject: true, bodyHtml: true, attempts: true },
    });
  }

  /** Chuyển queued → sent có điều kiện; xoá nội dung (OTP không nằm lâu trong DB) */
  async markSent(id: string, messageId: string, at: Date): Promise<boolean> {
    const r = await this.prisma.db.mailLog.updateMany({
      where: { id, status: 'queued' },
      data: { status: 'sent', providerMessageId: messageId, sentAt: at, bodyHtml: null },
    });
    return r.count === 1;
  }

  async recordAttempt(id: string, error: string, final: boolean): Promise<void> {
    await this.prisma.db.mailLog.updateMany({
      where: { id, status: 'queued' },
      data: {
        attempts: { increment: 1 },
        error: error.slice(0, 500),
        ...(final ? { status: 'failed', bodyHtml: null } : {}),
      },
    });
  }
}
