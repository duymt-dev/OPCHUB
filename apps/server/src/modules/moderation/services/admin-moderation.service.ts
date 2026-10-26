import { Injectable } from '@nestjs/common';
import type { DbTx, ReportSource, ReportStatus } from '@opchub/db';
import {
  type LockDays,
  type ModerationSettings,
  type Report,
  type ReportAction,
  VIOLATION_LOCK_REASON,
} from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { conflict, notFound } from '@/common/errors';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { type AdminActor, AdminUsersService } from '@/modules/account';
import { toReport } from '../domain/report.mapper';
import { type ReportRow, ReportRepository } from '../repositories/report.repository';
import { ViolationRepository } from '../repositories/violation.repository';
import { KeywordFilterService } from './keyword-filter.service';
import { ModerationSettingsService } from './moderation-settings.service';
import { type ViolationEffects, ViolationService } from './violation.service';

const ACTION_LABEL: Record<ReportAction, string> = {
  dismiss: 'Bỏ qua',
  hide: 'Ẩn & xóa tin',
  warn: 'Cảnh báo người gửi',
  lock: 'Khóa tài khoản người gửi',
  restore: 'Khôi phục tin',
};

/** Admin kiểm duyệt (`c.mod`, D-26; V4-612 §26.6): ca, xử lý, từ khoá, thời gian khoá — mọi thao tác ghi audit */
@Injectable()
export class AdminModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportRepository,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly users: AdminUsersService,
    private readonly filter: KeywordFilterService,
    private readonly violations: ViolationService,
    private readonly violationRepo: ViolationRepository,
    private readonly settings: ModerationSettingsService,
  ) {}

  async page(
    f: { status?: ReportStatus | undefined; source?: ReportSource | undefined },
    page: number,
    size: number,
  ) {
    const { rows, total } = await this.reports.page(f, page, size);
    // V4-612: số vi phạm 90 ngày của người gửi cho cả trang — một query
    const counts = await this.violationRepo.counts(
      rows.flatMap((r) => (r.sender_id ? [r.sender_id] : [])),
      new Date(),
    );
    const items = rows.map((r) => toReport(r, r.sender_id ? (counts.get(r.sender_id) ?? 0) : 0));
    return { items, page, size, total };
  }

  async one(id: string): Promise<Report> {
    const r = await this.reports.one(id);
    if (!r) throw notFound('Không tìm thấy báo cáo');
    const n = r.sender_id
      ? await this.violationRepo.count(this.prisma.db, r.sender_id, new Date())
      : 0;
    return toReport(r, n);
  }

  /**
   * `open → resolved` có điều kiện (0 dòng → 409). V4-612 (D-77):
   * - `restore` / `dismiss`: Khôi phục tin (hiện lại, bỏ tính vi phạm, mở khoá tự động nếu < 2);
   * - `lock`: khoá thủ công N ngày (mặc định theo cài đặt);
   * - `hide` / `warn` giữ cho client cũ.
   */
  async act(
    actor: AdminActor,
    id: string,
    action: ReportAction,
    note: string | null,
    days?: LockDays,
  ): Promise<Report> {
    const cur = await this.reports.one(id);
    if (!cur) throw notFound('Không tìm thấy báo cáo');
    const now = new Date();
    const fx = await this.prisma.db.$transaction(async (tx) => {
      if (!(await this.reports.resolve(tx, id, action, actor.id, note))) {
        throw conflict('Báo cáo đã được xử lý');
      }
      const effects = await this.apply(tx, actor, cur, { action, note, days, now });
      await this.log(
        tx,
        actor,
        `moderation.${action}`,
        id,
        `${ACTION_LABEL[action]}: ${cur.sender_name ?? ''}`,
      );
      return effects;
    });
    await this.violations.after(fx, now);
    return this.one(id);
  }

  private async apply(
    tx: DbTx,
    actor: AdminActor,
    cur: ReportRow,
    a: { action: ReportAction; note: string | null; days: LockDays | undefined; now: Date },
  ): Promise<ViolationEffects> {
    const none: ViolationEffects = { messageIds: [], locked: [], unlocked: [] };
    if (a.action === 'restore' || a.action === 'dismiss') {
      await this.reports.closeOpenOf(tx, cur.message_id, a.action, actor.id);
      return this.violations.restore(tx, actor, caseOf(cur), a.now);
    }
    if (a.action === 'hide') {
      await this.reports.hideMessage(tx, cur.message_id, actor.id);
      return { ...none, messageIds: [cur.message_id] };
    }
    if (a.action === 'warn' && cur.sender_id) {
      await this.outbox.add(tx, 'moderation.warned', {
        reportId: cur.id,
        userId: cur.sender_id,
        messageId: cur.message_id,
        roomId: cur.room_id,
      });
    }
    if (a.action === 'lock' && cur.sender_id) {
      const n = a.days ?? (await this.settings.get(tx)).autoLockDays;
      const locked = await this.users.setStatusTx(
        tx,
        actor,
        [cur.sender_id],
        'locked',
        a.note ?? VIOLATION_LOCK_REASON,
        { until: new Date(a.now.getTime() + n * 86_400_000), kind: 'manual' },
      );
      return { ...none, locked };
    }
    return none;
  }

  settingsOf(): Promise<ModerationSettings> {
    return this.settings.get();
  }

  saveSettings(actor: AdminActor, next: ModerationSettings): Promise<ModerationSettings> {
    return this.settings.save(actor, next);
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

const caseOf = (r: ReportRow) => ({
  reportId: r.id,
  messageId: r.message_id,
  roomId: r.room_id,
  senderId: r.sender_id,
});
