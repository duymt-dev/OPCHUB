import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import type {
  Campaign,
  CampaignAudience,
  campaignCreateSchema,
  MailJob,
} from '@opchub/shared/api-domains';
import type { z } from 'zod';
import { AuditService } from '@/common/audit';
import { conflict, notFound } from '@/common/errors';
import { sanitizeRichHtml } from '@/common/html/sanitize';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CAMPAIGN_SELECT, type CampaignRow, toCampaign } from '../domain/campaign.mapper';
import { AudienceRepository } from '../repositories/audience.repository';

type CampaignInput = z.output<typeof campaignCreateSchema>;
export interface Actor {
  id: string;
  ip: string | null;
}

const NOT_FOUND = 'Không tìm thấy chiến dịch';
const STATUS_BY_MODE = { draft: 'draft', schedule: 'scheduled', send: 'sending' } as const;

/**
 * Chiến dịch email (`n.edit`, D-78). Gửi = chuyển `sending` + outbox `campaign.send` cùng transaction
 * (luật 8); worker gửi theo lô. Đổi trạng thái luôn `WHERE status IN (...)` (luật 7).
 */
@Injectable()
export class CampaignService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audience: AudienceRepository,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
  ) {}

  /** Màn Marketing tải một lần, mới trước (idx created_at DESC, id) */
  async list(): Promise<Campaign[]> {
    const rows = await this.prisma.db.campaign.findMany({
      select: CAMPAIGN_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 200,
    });
    const names = await this.audience.groupNames(rows.flatMap((r) => r.groupIds));
    return rows.map((r) => toCampaign(r, names));
  }

  estimate(audience: CampaignAudience, groupIds: readonly string[]): Promise<number> {
    return this.audience.estimate(audience, [...new Set(groupIds)]);
  }

  async create(actor: Actor, c: CampaignInput, now = new Date()): Promise<Campaign> {
    const groupIds = c.audience === 'groups' ? [...new Set(c.groupIds)] : [];
    const status = STATUS_BY_MODE[c.mode];
    const recipients = status === 'draft' ? null : await this.estimate(c.audience, groupIds);
    const sendAt =
      status === 'sending'
        ? now
        : status === 'scheduled' && c.scheduledAt
          ? new Date(c.scheduledAt)
          : null;
    const row = await this.prisma.db.$transaction(async (tx: DbTx) => {
      const r = await tx.campaign.create({
        data: {
          name: c.name,
          subject: c.subject,
          bodyHtml: sanitizeRichHtml(c.body),
          audience: c.audience,
          groupIds,
          status,
          recipients,
          sendAt,
          createdBy: actor.id,
        },
        select: CAMPAIGN_SELECT,
      });
      if (status === 'sending') await this.outbox.add(tx, 'campaign.send', { campaignId: r.id });
      await this.log(tx, actor, `campaign.${c.mode}`, r.id, this.verb(c.mode, r.name));
      return r;
    });
    return this.one(row);
  }

  /** "Gửi ngay" từ Bản nháp / Đã lên lịch → Đang gửi; lần 2 → 409 */
  async send(actor: Actor, id: string, now = new Date()): Promise<MailJob> {
    const cur = await this.prisma.db.campaign.findUnique({
      where: { id },
      select: { audience: true, groupIds: true, recipients: true, name: true },
    });
    if (!cur) throw notFound(NOT_FOUND);
    const recipients = cur.recipients ?? (await this.estimate(cur.audience, cur.groupIds));
    await this.prisma.db.$transaction(async (tx: DbTx) => {
      const r = await tx.campaign.updateMany({
        where: { id, status: { in: ['draft', 'scheduled'] } },
        data: { status: 'sending', recipients, sendAt: now, sendCursor: null },
      });
      if (r.count === 0) throw conflict('Chiến dịch đã gửi hoặc đang gửi');
      await this.outbox.add(tx, 'campaign.send', { campaignId: id });
      await this.log(tx, actor, 'campaign.send', id, `gửi chiến dịch ${cur.name}`);
    });
    return { jobId: id, status: 'queued', recipients };
  }

  async remove(actor: Actor, id: string): Promise<{ id: string }> {
    await this.prisma.db.$transaction(async (tx: DbTx) => {
      const rows = await tx.$queryRaw<{ name: string }[]>`
        DELETE FROM campaigns WHERE id = ${id} AND status <> 'sending' RETURNING name`;
      const row = rows[0];
      if (!row) {
        const exists = await tx.campaign.findUnique({ where: { id }, select: { id: true } });
        throw exists ? conflict('Chiến dịch đang gửi, không thể xóa') : notFound(NOT_FOUND);
      }
      await this.log(tx, actor, 'campaign.delete', id, `xoá chiến dịch ${row.name}`);
    });
    return { id };
  }

  /** Scheduler mỗi phút: `scheduled` đến hạn → `sending` + outbox (một UPDATE cho cả lô) */
  async sendDue(now = new Date()): Promise<number> {
    return this.prisma.db.$transaction(async (tx: DbTx) => {
      const due = await tx.campaign.updateManyAndReturn({
        where: { status: 'scheduled', sendAt: { lte: now } },
        data: { status: 'sending', sendCursor: null },
        select: { id: true },
      });
      await this.outbox.addMany(
        tx,
        'campaign.send',
        due.map((d) => ({ campaignId: d.id })),
      );
      return due.length;
    });
  }

  private async one(r: CampaignRow): Promise<Campaign> {
    return toCampaign(r, await this.audience.groupNames(r.groupIds));
  }

  private verb(mode: CampaignInput['mode'], name: string): string {
    if (mode === 'draft') return `lưu nháp chiến dịch ${name}`;
    if (mode === 'schedule') return `lên lịch chiến dịch ${name}`;
    return `gửi chiến dịch ${name}`;
  }

  private log(tx: DbTx, actor: Actor, action: string, id: string, summary: string) {
    return this.audit.log(tx, {
      actorId: actor.id,
      action,
      entity: 'campaign',
      entityId: id,
      tag: 'content',
      summary,
      ip: actor.ip,
    });
  }
}
