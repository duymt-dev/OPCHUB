import { Injectable } from '@nestjs/common';
import type { DbTx, MailKind } from '@opchub/db';
import {
  MAIL_NO_RESEND_KINDS,
  type MailJob,
  type MailLogRow,
  type MailTemplate,
  type MarketingSummary,
} from '@opchub/shared/api-domains';
import { mailTemplates } from '@opchub/shared/fixtures';
import { AuditService } from '@/common/audit';
import { notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AppSettingsService } from '@/modules/settings';
import { layout, MailService, welcomeMail } from '@/modules/mail';
import type { Actor } from './campaign.service';

const DAY_MS = 86_400_000;
const RESEND_SENT_KINDS: MailKind[] = ['welcome', 'campaign'];
const RESEND_FAILED_KINDS = (
  ['welcome', 'campaign', 'fee_reminder', 'event', 'test', 'otp', 'password_reset'] as const
).filter((k) => !MAIL_NO_RESEND_KINDS.includes(k));

/**
 * Nhật ký thư Admin (NA-05): mọi loại thư, mọi trạng thái (Đang chờ / Đã gửi / Lỗi / Đã huỷ), số lần
 * thử, lỗi gần nhất. Index `mail_logs_log_keyset (created_at DESC, id)`; deferred join: trang id
 * trước, cột hiển thị + tên người nhận lấy một query cho cả trang. Không trả nội dung thư.
 */
@Injectable()
export class MailLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: AppSettingsService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
  ) {}

  /** Mẫu soạn nhanh (hằng prototype — Q-B42-2) */
  templates(): MailTemplate[] {
    return mailTemplates();
  }

  async page(page: number, size: number) {
    const [ids, total] = await Promise.all([
      this.prisma.db.mailLog.findMany({
        select: { id: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * size,
        take: size,
      }),
      this.prisma.db.mailLog.count(),
    ]);
    const rows = ids.length
      ? await this.prisma.db.mailLog.findMany({
          where: { id: { in: ids.map((r) => r.id) } },
          select: {
            id: true,
            kind: true,
            to: true,
            subject: true,
            status: true,
            attempts: true,
            error: true,
            sentAt: true,
            createdAt: true,
          },
        })
      : [];
    const users = rows.length
      ? await this.prisma.db.user.findMany({
          where: { email: { in: [...new Set(rows.map((r) => r.to))] } },
          select: { email: true, fullName: true },
        })
      : [];
    const nameOf = new Map(users.map((u) => [u.email.toLowerCase(), u.fullName]));
    const byId = new Map(rows.map((r) => [r.id, r]));
    const items: MailLogRow[] = ids.flatMap(({ id }) => {
      const r = byId.get(id);
      if (!r) return [];
      return [
        {
          id: r.id,
          kind: r.kind,
          to: r.to,
          name: nameOf.get(r.to.toLowerCase()) ?? r.to.split('@')[0] ?? r.to,
          subject: r.subject,
          sentAt: (r.sentAt ?? r.createdAt).toISOString(),
          status: r.status,
          attempts: r.attempts,
          error: r.error,
        },
      ];
    });
    return { items, page, size, total };
  }

  async summary(now = new Date()): Promise<MarketingSummary> {
    const since = new Date(now.getTime() - 30 * DAY_MS);
    const [campaigns, sent30d, avg, welcomeSent] = await Promise.all([
      this.prisma.db.campaign.count(),
      this.prisma.db.mailLog.count({
        where: { status: 'sent', kind: { in: ['welcome', 'campaign'] }, createdAt: { gte: since } },
      }),
      this.prisma.db.campaign.aggregate({
        where: { status: 'sent', openRate: { not: null } },
        _avg: { openRate: true },
      }),
      this.prisma.db.mailLog.count({ where: { status: 'sent', kind: 'welcome' } }),
    ]);
    const a = avg._avg.openRate;
    return { campaigns, sent30d, avgOpenRate: a === null ? null : Math.round(a), welcomeSent };
  }

  /**
   * Gửi lại: thư đã gửi (chào mừng / chiến dịch) hoặc thư lỗi (mọi loại trừ OTP / đặt lại MK — mã
   * đã hết hạn). Nội dung: thư lỗi còn giữ nội dung → gửi đúng nội dung đó; chào mừng = mẫu hiện
   * tại; chiến dịch = nội dung đã lưu. Không dựng lại được → 404.
   */
  async resend(actor: Actor, id: string): Promise<MailJob> {
    const row = await this.prisma.db.mailLog.findFirst({
      where: {
        id,
        OR: [
          { status: 'sent', kind: { in: RESEND_SENT_KINDS } },
          { status: 'failed', kind: { in: RESEND_FAILED_KINDS } },
        ],
      },
      select: {
        to: true,
        kind: true,
        subject: true,
        status: true,
        campaignId: true,
        bodyHtml: true,
      },
    });
    if (!row) throw notFound('Không tìm thấy email');
    const user = await this.prisma.db.user.findUnique({
      where: { email: row.to },
      select: { fullName: true },
    });
    const content = await this.render(row, user?.fullName ?? row.to);
    if (!content) throw notFound('Không tìm thấy email');
    const jobId = await this.prisma.db.$transaction(async (tx: DbTx) => {
      const mailId = await this.mail.request(tx, {
        to: row.to,
        kind: row.kind,
        subject: content.subject,
        html: content.html,
        ...(row.campaignId ? { campaignId: row.campaignId } : {}),
      });
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'mail.resend',
        entity: 'mail',
        entityId: id,
        tag: 'content',
        summary: `gửi lại email tới ${row.to}`,
        ip: actor.ip,
      });
      return mailId;
    });
    return { jobId, status: 'queued', recipients: 1 };
  }

  private async render(
    row: {
      kind: MailKind;
      subject: string;
      status: string;
      campaignId: string | null;
      bodyHtml: string | null;
    },
    name: string,
  ): Promise<{ subject: string; html: string } | null> {
    if (row.status === 'failed' && row.bodyHtml)
      return { subject: row.subject, html: row.bodyHtml };
    if (row.kind === 'campaign' && row.campaignId) {
      const c = await this.prisma.db.campaign.findUnique({
        where: { id: row.campaignId },
        select: { subject: true, bodyHtml: true },
      });
      return c ? { subject: c.subject, html: layout(c.subject, c.bodyHtml) } : null;
    }
    if (row.kind === 'welcome') {
      return welcomeMail(await this.settings.welcomeMail(), name);
    }
    return null;
  }
}
