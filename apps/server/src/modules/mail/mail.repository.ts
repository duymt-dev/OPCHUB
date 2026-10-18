import { Injectable } from '@nestjs/common';
import type { DbTx, MailKind } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';
import { priorityOf } from './mail-priority';

export interface NewMail {
  to: string;
  kind: MailKind;
  subject: string;
  html: string;
  campaignId?: string;
}

const row = (m: NewMail) => ({
  to: m.to,
  kind: m.kind,
  subject: m.subject,
  bodyHtml: m.html,
  campaignId: m.campaignId ?? null,
  priority: priorityOf(m.kind),
});

/** Bảng mail_logs — chỉ domain mail ghi */
@Injectable()
export class MailRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tx: DbTx, m: NewMail): Promise<{ id: string; priority: number }> {
    return tx.mailLog.create({ data: row(m), select: { id: true, priority: true } });
  }

  async createMany(
    tx: DbTx,
    mails: readonly NewMail[],
  ): Promise<{ id: string; priority: number }[]> {
    if (!mails.length) return [];
    return tx.mailLog.createManyAndReturn({
      data: mails.map(row),
      select: { id: true, priority: true },
    });
  }

  findQueued(id: string) {
    return this.prisma.db.mailLog.findFirst({
      where: { id, status: 'queued' },
      select: {
        id: true,
        to: true,
        kind: true,
        subject: true,
        bodyHtml: true,
        attempts: true,
        priority: true,
      },
    });
  }

  /** BUG-036: người nhận đã huỷ nhận thư chiến dịch (PK citext) */
  async isSuppressed(email: string): Promise<boolean> {
    const r = await this.prisma.db.mailSuppression.findUnique({
      where: { email },
      select: { email: true },
    });
    return r !== null;
  }

  /** Thư chiến dịch tới người đã huỷ nhận sau khi xếp hàng → `cancelled` (không gửi) */
  async cancelQueued(id: string, reason: string): Promise<void> {
    await this.prisma.db.mailLog.updateMany({
      where: { id, status: 'queued' },
      data: { status: 'cancelled', bodyHtml: null, error: reason, nextAttemptAt: null },
    });
  }

  /** Chuyển queued → sent có điều kiện; xoá nội dung (OTP không nằm lâu trong DB) */
  async markSent(id: string, messageId: string, at: Date): Promise<boolean> {
    const r = await this.prisma.db.mailLog.updateMany({
      where: { id, status: 'queued' },
      data: {
        status: 'sent',
        providerMessageId: messageId,
        sentAt: at,
        bodyHtml: null,
        nextAttemptAt: null,
      },
    });
    return r.count === 1;
  }

  /** NA-05: hết hạn mức ngày → mốc gửi lại (không tính lần thử) */
  async defer(id: string, until: Date): Promise<void> {
    await this.prisma.db.mailLog.updateMany({
      where: { id, status: 'queued' },
      data: { nextAttemptAt: until },
    });
  }

  /**
   * Lỗi gửi: +1 lần thử, lỗi gần nhất; lần cuối → `failed`, chưa cuối → mốc thử lại kế tiếp.
   * `failed` giữ nội dung để Admin "Gửi lại" (NA-05) — trừ OTP / đặt lại MK (`dropBody`): mã / link
   * không nằm lâu trong DB.
   */
  async recordAttempt(
    id: string,
    error: string,
    final: boolean,
    nextAttemptAt: Date | null = null,
    dropBody = true,
  ): Promise<void> {
    await this.prisma.db.mailLog.updateMany({
      where: { id, status: 'queued' },
      data: {
        attempts: { increment: 1 },
        error: error.slice(0, 500),
        nextAttemptAt: final ? null : nextAttemptAt,
        ...(final ? { status: 'failed', ...(dropBody ? { bodyHtml: null } : {}) } : {}),
      },
    });
  }
}
