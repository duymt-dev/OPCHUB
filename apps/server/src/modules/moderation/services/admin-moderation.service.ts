import { Injectable } from '@nestjs/common';
import type { DbTx, ReportSource, ReportStatus } from '@opchub/db';
import type { Report, ReportAction } from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { conflict, notFound } from '@/common/errors';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { type AdminActor, AdminUsersService } from '@/modules/account';
import { toReport } from '../domain/report.mapper';
import { ReportRepository } from '../repositories/report.repository';
import { KeywordFilterService } from './keyword-filter.service';

const ACTION_LABEL: Record<ReportAction, string> = {
  dismiss: 'Bỏ qua',
  hide: 'Ẩn & xóa tin',
  warn: 'Cảnh báo người gửi',
  lock: 'Khóa tài khoản người gửi',
};

/** Admin kiểm duyệt (`c.mod`, D-26): hàng đợi ca, xử lý, từ khoá — mọi thao tác ghi audit */
@Injectable()
export class AdminModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportRepository,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly users: AdminUsersService,
    private readonly filter: KeywordFilterService,
  ) {}

  async page(
    f: { status?: ReportStatus | undefined; source?: ReportSource | undefined },
    page: number,
    size: number,
  ) {
    const { rows, total } = await this.reports.page(f, page, size);
    return { items: rows.map(toReport), page, size, total };
  }

  async one(id: string): Promise<Report> {
    const r = await this.reports.one(id);
    if (!r) throw notFound('Không tìm thấy báo cáo');
    return toReport(r);
  }

  /**
   * `open → resolved` có điều kiện (0 dòng → 409). Ẩn tin: `hidden_at` + đóng ca cùng tin;
   * cảnh báo: outbox `moderation.warned` (thông báo B25); khoá: qua AdminUsers (outbox + Redis).
   */
  async act(
    actor: AdminActor,
    id: string,
    action: ReportAction,
    note: string | null,
  ): Promise<Report> {
    const cur = await this.reports.one(id);
    if (!cur) throw notFound('Không tìm thấy báo cáo');
    await this.prisma.db.$transaction(async (tx) => {
      if (!(await this.reports.resolve(tx, id, action, actor.id, note))) {
        throw conflict('Báo cáo đã được xử lý');
      }
      if (action === 'hide') await this.reports.hideMessage(tx, cur.message_id, actor.id);
      if (action === 'warn' && cur.sender_id) {
        await this.outbox.add(tx, 'moderation.warned', {
          reportId: id,
          userId: cur.sender_id,
          messageId: cur.message_id,
          roomId: cur.room_id,
        });
      }
      await this.log(
        tx,
        actor,
        `moderation.${action}`,
        id,
        `${ACTION_LABEL[action]}: ${cur.sender_name ?? ''}`,
      );
    });
    if (action === 'lock' && cur.sender_id) {
      await this.users.setStatus(actor, [cur.sender_id], 'locked', note ?? 'Vi phạm nội quy chat');
    }
    const after = await this.reports.one(id);
    if (!after) throw notFound('Không tìm thấy báo cáo');
    return toReport(after);
  }

  async keywords(): Promise<string[]> {
    const rows = await this.prisma.db.moderationKeyword.findMany({
      select: { word: true },
      orderBy: [{ createdAt: 'asc' }, { word: 'asc' }],
    });
    return rows.map((r) => r.word);
  }

  async addKeyword(actor: AdminActor, word: string): Promise<string[]> {
    await this.prisma.db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ word: string }[]>`
        INSERT INTO moderation_keywords (word, created_by, created_at)
        VALUES (${word}, ${actor.id}, clock_timestamp()) ON CONFLICT DO NOTHING RETURNING word`;
      if (!rows.length) throw conflict('Từ khóa đã có');
      await this.log(tx, actor, 'moderation.keyword.add', word, `Thêm từ khóa "${word}"`);
    });
    await this.filter.publishChange();
    return this.keywords();
  }

  async removeKeyword(actor: AdminActor, word: string): Promise<string[]> {
    await this.prisma.db.$transaction(async (tx) => {
      const r = await tx.$executeRaw`DELETE FROM moderation_keywords WHERE word = ${word}::citext`;
      if (!r) throw notFound('Không tìm thấy từ khóa');
      await this.log(tx, actor, 'moderation.keyword.remove', word, `Xóa từ khóa "${word}"`);
    });
    await this.filter.publishChange();
    return this.keywords();
  }

  private log(tx: DbTx, actor: AdminActor, action: string, entityId: string, summary: string) {
    return this.audit.log(tx, {
      actorId: actor.id,
      action,
      entity: 'moderation',
      entityId: entityId.slice(0, 200),
      tag: 'moderation',
      summary: summary.slice(0, 500),
      ip: actor.ip,
    });
  }
}
