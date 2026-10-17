import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import {
  type MailJob,
  type MailLogRow,
  type MailTemplate,
  type MarketingSummary,
} from '@opchub/shared/api-domains';
import { listMailTemplates } from '@opchub/shared/mock-domains';
import { AuditService } from '@/common/audit';
import { notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AppSettingsService } from '@/modules/settings';
import { MailService, welcomeMail } from '@/modules/mail';
import type { Actor } from './campaign.service';

const DAY_MS = 86_400_000;
type LogKind = MailLogRow['kind'];

/**
 * Nhật ký thư Admin (chào mừng + chiến dịch, đã gửi) — partial idx `mail_logs_sent_visible`;
 * deferred join: trang id trước, tên người nhận lấy một query theo email.
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
    return listMailTemplates();
  }

  async page(page: number, size: number) {
    const where = {
      status: 'sent' as const,
      kind: { in: ['welcome' as const, 'campaign' as const] },
    };
    const [ids, total] = await Promise.all([
      this.prisma.db.mailLog.findMany({
        where,
        select: { id: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * size,
        take: size,
      }),
      this.prisma.db.mailLog.count({ where }),
    ]);
    const rows = ids.length
      ? await this.prisma.db.mailLog.findMany({
          where: { id: { in: ids.map((r) => r.id) } },
          select: { id: true, kind: true, to: true, subject: true, sentAt: true, createdAt: true },
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
          kind: r.kind as LogKind,
          to: r.to,
          name: nameOf.get(r.to.toLowerCase()) ?? r.to.split('@')[0] ?? r.to,
          subject: r.subject,
          sentAt: (r.sentAt ?? r.createdAt).toISOString(),
          status: 'sent',
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

  /** Gửi lại: dựng lại nội dung (chào mừng: mẫu hiện tại; chiến dịch: nội dung đã lưu) */
  async resend(actor: Actor, id: string): Promise<MailJob> {
    const row = await this.prisma.db.mailLog.findFirst({
      where: { id, status: 'sent', kind: { in: ['welcome', 'campaign'] } },
      select: { to: true, kind: true, campaignId: true },
    });
    if (!row) throw notFound('Không tìm thấy email');
    const user = await this.prisma.db.user.findUnique({
      where: { email: row.to },
      select: { fullName: true },
    });
    const name = user?.fullName ?? row.to;
    const content = await this.render(row.kind, row.campaignId, name);
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

  private async render(kind: string, campaignId: string | null, name: string) {
    if (kind === 'campaign' && campaignId) {
      const c = await this.prisma.db.campaign.findUnique({
        where: { id: campaignId },
        select: { subject: true, bodyHtml: true },
      });
      if (c) return { subject: c.subject, html: c.bodyHtml };
    }
    return welcomeMail(await this.settings.welcomeMail(), name);
  }
}
