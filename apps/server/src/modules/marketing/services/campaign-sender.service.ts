import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';
import { esc, MailService } from '@/modules/mail';
import { AudienceRepository } from '../repositories/audience.repository';

/** Mỗi lô: 1 SELECT người nhận + 1 INSERT mail_logs + 1 INSERT outbox + 1 UPDATE con trỏ */
export const CAMPAIGN_BATCH = 500;

/**
 * Worker `campaign.send` (B42): xếp thư theo lô keyset. Con trỏ `send_cursor` cập nhật CÙNG
 * transaction với lô thư (`UPDATE … WHERE send_cursor IS NOT DISTINCT FROM <cũ>`) → job chạy lại
 * hoặc chạy song song không xếp trùng. Lô thiếu (hết người nhận) → `sent`.
 */
@Injectable()
export class CampaignSenderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audience: AudienceRepository,
    private readonly mail: MailService,
  ) {}

  /** Xếp một lô; trả `more` để processor xếp job lô sau */
  async runBatch(campaignId: string): Promise<{ queued: number; more: boolean }> {
    const c = await this.prisma.db.campaign.findFirst({
      where: { id: campaignId, status: 'sending' },
      select: {
        subject: true,
        bodyHtml: true,
        audience: true,
        groupIds: true,
        sendCursor: true,
      },
    });
    if (!c) return { queued: 0, more: false };
    const batch = await this.audience.batch(c.audience, c.groupIds, c.sendCursor, CAMPAIGN_BATCH);
    const last = batch.at(-1);
    // Lô thiếu = hết người nhận → `sent` ngay trong cùng UPDATE
    const done = batch.length < CAMPAIGN_BATCH;
    return this.prisma.db.$transaction(async (tx: DbTx) => {
      const moved = await tx.campaign.updateMany({
        where: { id: campaignId, status: 'sending', sendCursor: c.sendCursor },
        data: done ? { status: 'sent', sendCursor: null } : { sendCursor: last?.id ?? null },
      });
      // Job khác đã xử lý lô này
      if (moved.count === 0) return { queued: 0, more: false };
      const queued = await this.mail.requestMany(
        tx,
        batch.map((r) => ({
          to: r.email,
          kind: 'campaign' as const,
          subject: c.subject,
          html: personalize(c.bodyHtml, r.fullName),
          campaignId,
        })),
      );
      // Xong: chốt số người nhận thật (ước tính theo nhóm dùng member_count — Q-B42-1)
      if (done) {
        await tx.$executeRaw`
          UPDATE campaigns SET recipients =
            (SELECT count(*)::int FROM mail_logs WHERE campaign_id = ${campaignId})
          WHERE id = ${campaignId}`;
      }
      return { queued, more: !done };
    });
  }
}

/** Nội dung đã sanitize lúc ghi; chỉ chèn lời chào (escape tên) */
function personalize(bodyHtml: string, fullName: string): string {
  return (
    `<!doctype html><html lang="vi"><body style="font-family:Arial,sans-serif;color:#1f1f1f">` +
    `<p>Xin chào ${esc(fullName)},</p>${bodyHtml}` +
    `<p style="color:#8c8c8c;font-size:12px">OPC Hub Community</p></body></html>`
  );
}
