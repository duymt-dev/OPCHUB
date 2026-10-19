import { Inject, Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { ENV, type Env } from '@/common/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MailService, UnsubscribeToken } from '@/modules/mail';
import { personalize } from '../domain/personalize';
import { AudienceRepository } from '../repositories/audience.repository';

/** Mỗi lô: 1 SELECT người nhận + 1 SELECT nhóm đầu tiên + 1 INSERT mail_logs + 1 INSERT outbox + 1 UPDATE con trỏ */
export const CAMPAIGN_BATCH = 500;

/**
 * Worker `campaign.send` (B42): xếp thư theo lô keyset. Con trỏ `send_cursor` cập nhật CÙNG
 * transaction với lô thư (`UPDATE … WHERE send_cursor IS NOT DISTINCT FROM <cũ>`) → job chạy lại
 * hoặc chạy song song không xếp trùng. Lô thiếu (hết người nhận) → `sent`. Chiến dịch bị dừng
 * (`cancelled`, BUG-036) → không còn `sending` → không xếp lô nào nữa. Mỗi thư có link huỷ nhận.
 */
@Injectable()
export class CampaignSenderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audience: AudienceRepository,
    private readonly mail: MailService,
    private readonly unsub: UnsubscribeToken,
    @Inject(ENV) private readonly env: Env,
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
    const groups = await this.audience.firstGroups(batch.map((r) => r.id));
    const loginUrl = `${this.env.PORTAL_URL}/login`;
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
          html: personalize(c.bodyHtml, {
            fullName: r.fullName,
            email: r.email,
            group: groups.get(r.id) ?? '',
            loginUrl,
            unsubscribeUrl: this.unsub.pageUrl(r.email),
          }),
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
