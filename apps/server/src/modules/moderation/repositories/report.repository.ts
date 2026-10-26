import { Injectable } from '@nestjs/common';
import type { DbTx, ReportAction, ReportSource, ReportStatus } from '@opchub/db';
import { Prisma } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface ReportRow {
  id: string;
  sender_id: string | null;
  sender_name: string | null;
  group_name: string;
  room_id: string;
  message_id: string;
  body: string;
  hit: string;
  reason: string;
  source: ReportSource;
  reporter_count: number;
  status: ReportStatus;
  created_at: Date;
  /** V4-612: trạng thái khoá người gửi (thẻ "Đã khóa N ngày" / nút "Khóa N ngày") */
  sender_status: 'active' | 'locked' | null;
  sender_locked_until: Date | null;
}

/** Ca kiểm duyệt (`reports`) + lượt báo của từng người (`message_flags`) */
@Injectable()
export class ReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** PK (message_id, user_id): đã báo → false */
  async addFlag(
    tx: DbTx,
    messageId: string,
    userId: string,
    reason: string,
    note: string | null,
  ): Promise<boolean> {
    const rows = await tx.$queryRaw<{ ok: number }[]>`
      INSERT INTO message_flags (message_id, user_id, reason, note, created_at)
      VALUES (${messageId}, ${userId}, ${reason}, ${note}, now())
      ON CONFLICT DO NOTHING RETURNING 1 AS ok`;
    return rows.length === 1;
  }

  /**
   * Upsert ca mở theo (tin, nguồn) — UQ partial reports_open_case. Thành viên báo: +1 người báo;
   * từ khoá: giữ nguyên (idempotent khi job chạy lại).
   */
  async upsertOpenCase(
    tx: DbTx,
    c: { messageId: string; source: ReportSource; reason: string; hit: string; bump: boolean },
  ): Promise<string> {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      INSERT INTO reports (id, message_id, source, reason, hit, reporter_count, status, created_at, updated_at)
      VALUES (gen_random_uuid()::text, ${c.messageId}, ${c.source}::report_source, ${c.reason}, ${c.hit},
              ${c.bump ? 1 : 0}, 'open', now(), now())
      ON CONFLICT (message_id, source) WHERE status = 'open'
      DO UPDATE SET reporter_count = reports.reporter_count + ${c.bump ? 1 : 0}, updated_at = now()
      RETURNING id`;
    const id = rows[0]?.id;
    if (!id) throw new Error('Không tạo được ca kiểm duyệt');
    return id;
  }

  private select(where: Prisma.Sql) {
    return Prisma.sql`
      SELECT r.id, m.sender_id, u.full_name AS sender_name, g.name AS group_name, m.room_id, m.id AS message_id,
             m.body, r.hit, r.reason, r.source, r.reporter_count, r.status, r.created_at,
             u.status::text AS sender_status, u.locked_until AS sender_locked_until
      FROM reports r
      JOIN messages m ON m.id = r.message_id
      JOIN rooms rm ON rm.id = m.room_id
      JOIN groups g ON g.id = rm.group_id
      LEFT JOIN users u ON u.id = m.sender_id
      ${where}`;
  }

  /**
   * Danh sách ca, mới trước — deferred join: id theo idx `reports_open_queue` (status = open) rồi mới
   * join tin/nhóm/người gửi cho đúng trang.
   */
  async page(
    f: { status?: ReportStatus | undefined; source?: ReportSource | undefined },
    page: number,
    size: number,
  ): Promise<{ rows: ReportRow[]; total: number }> {
    const conds = [
      f.status ? Prisma.sql`status = ${f.status}::report_status` : null,
      f.source ? Prisma.sql`source = ${f.source}::report_source` : null,
    ].filter((c): c is Prisma.Sql => c !== null);
    const where = conds.length ? Prisma.sql`WHERE ${Prisma.join(conds, ' AND ')}` : Prisma.empty;
    const [ids, count] = await Promise.all([
      this.prisma.db.$queryRaw<{ id: string }[]>`
        SELECT id FROM reports ${where} ORDER BY created_at DESC, id DESC
        LIMIT ${size} OFFSET ${(page - 1) * size}`,
      this.prisma.db.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM reports ${where}`,
    ]);
    if (!ids.length) return { rows: [], total: count[0]?.n ?? 0 };
    const rows = await this.prisma.db.$queryRaw<ReportRow[]>(
      this.select(
        Prisma.sql`WHERE r.id = ANY(${ids.map((r) => r.id)}::text[]) ORDER BY r.created_at DESC, r.id DESC`,
      ),
    );
    return { rows, total: count[0]?.n ?? 0 };
  }

  async one(
    id: string,
    db: DbTx | PrismaService['db'] = this.prisma.db,
  ): Promise<ReportRow | null> {
    const rows = await db.$queryRaw<ReportRow[]>(this.select(Prisma.sql`WHERE r.id = ${id}`));
    return rows[0] ?? null;
  }

  /** `open → resolved` có điều kiện (luật 7) */
  async resolve(
    tx: DbTx,
    id: string,
    action: ReportAction,
    by: string,
    note: string | null,
  ): Promise<boolean> {
    const r = await tx.report.updateMany({
      where: { id, status: 'open' },
      data: { status: 'resolved', action, note, resolvedBy: by, resolvedAt: new Date() },
    });
    return r.count === 1;
  }

  /** V4-612: đóng các ca mở khác của cùng tin (Khôi phục tin áp cho cả tin) */
  async closeOpenOf(tx: DbTx, messageId: string, action: ReportAction, by: string): Promise<void> {
    await tx.report.updateMany({
      where: { messageId, status: 'open' },
      data: { status: 'resolved', action, resolvedBy: by, resolvedAt: new Date() },
    });
  }

  /** Ẩn tin khỏi phòng — đóng luôn các ca mở khác của cùng tin */
  async hideMessage(tx: DbTx, messageId: string, by: string): Promise<void> {
    await tx.message.updateMany({
      where: { id: messageId, hiddenAt: null },
      data: { hiddenAt: new Date() },
    });
    await tx.report.updateMany({
      where: { messageId, status: 'open' },
      data: { status: 'resolved', action: 'hide', resolvedBy: by, resolvedAt: new Date() },
    });
  }
}
