import { Injectable } from '@nestjs/common';
import { type DbTx, type InvestorInterestStatus, type InvestorKind, Prisma } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface InvestorGroupRow {
  investor_key: string;
  first_id: string;
  name: string;
  avatar_url: string | null;
  kind: InvestorKind;
  organization: string;
  phone: string;
  total_amount: bigint;
  last_at: Date;
  status: InvestorInterestStatus;
  comment_count: number;
}

export interface InvestorFilter {
  kind?: InvestorKind | undefined;
  q?: string | undefined;
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * Admin "Nhà đầu tư": đọc `investor_summaries` (gom theo `investor_key` = user_id, Q-G5c-1) —
 * bảng tổng hợp cập nhật cùng transaction với `investor_interests`, danh sách là Index Scan
 * `(last_at DESC)` / `(kind, last_at DESC)` thay vì GROUP BY toàn bảng.
 */
@Injectable()
export class InvestorAdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  private grouped(f: InvestorFilter): Prisma.Sql {
    const kind = f.kind ? Prisma.sql`s.kind = ${f.kind}::investor_kind` : Prisma.sql`TRUE`;
    const q = f.q
      ? Prisma.sql`(u.full_name || ' ' || s.organization || ' ' || s.phone) ILIKE ${`%${escapeLike(f.q)}%`}`
      : Prisma.sql`TRUE`;
    return Prisma.sql`
      SELECT s.investor_key, s.first_interest_id AS first_id, u.full_name AS name, u.avatar_url,
             s.kind, s.organization, s.phone, s.total_amount, s.last_at, s.status,
             (SELECT count(*)::int FROM investor_comments n WHERE n.investor_key = s.investor_key)
               AS comment_count
      FROM investor_summaries s
      JOIN users u ON u.id = s.user_id
      WHERE ${kind} AND ${q}`;
  }

  async page(f: InvestorFilter, page: number, size: number) {
    const base = this.grouped(f);
    const [rows, total] = await Promise.all([
      this.prisma.db.$queryRaw<InvestorGroupRow[]>`
        ${base} ORDER BY s.last_at DESC, s.investor_key LIMIT ${size} OFFSET ${(page - 1) * size}`,
      this.prisma.db.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM (${base}) x`,
    ]);
    return { rows, total: total[0]?.n ?? 0 };
  }

  /** Toàn bộ (export) — có trần */
  all(f: InvestorFilter) {
    return this.prisma.db.$queryRaw<InvestorGroupRow[]>`
      ${this.grouped(f)} ORDER BY s.last_at DESC, s.investor_key LIMIT 5000`;
  }

  async one(investorKey: string): Promise<InvestorGroupRow | null> {
    const rows = await this.prisma.db.$queryRaw<InvestorGroupRow[]>`
      ${this.grouped({})} AND s.investor_key = ${investorKey}`;
    return rows[0] ?? null;
  }

  /** Đếm theo loại + tổng tiền — bảng tổng hợp (mỗi nhà đầu tư 1 dòng) */
  summary() {
    return this.prisma.db.investorSummary.groupBy({
      by: ['kind'],
      _count: { _all: true },
      _sum: { totalAmount: true },
    });
  }

  /** `key` trong URL là id quan tâm đầu tiên của nhà đầu tư → `investor_key` */
  async keyOf(id: string): Promise<{ investorKey: string; name: string } | null> {
    const r = await this.prisma.db.investorInterest.findUnique({
      where: { id },
      select: { investorKey: true, user: { select: { fullName: true } } },
    });
    return r ? { investorKey: r.investorKey, name: r.user.fullName } : null;
  }

  /** Các lần quan tâm của các nhà đầu tư trên trang — 1 query */
  items(keys: readonly string[]) {
    if (!keys.length) return Promise.resolve([]);
    return this.prisma.db.investorInterest.findMany({
      where: { investorKey: { in: [...keys] } },
      select: {
        id: true,
        investorKey: true,
        projectId: true,
        amount: true,
        currency: true,
        message: true,
        createdAt: true,
        project: { select: { name: true, owner: { select: { fullName: true } } } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  /** Trạng thái tổng hợp hiện tại — `from` của transition (§9) */
  async statusOf(investorKey: string): Promise<InvestorInterestStatus | null> {
    const r = await this.prisma.db.investorSummary.findUnique({
      where: { investorKey },
      select: { status: true },
    });
    return r?.status ?? null;
  }

  /**
   * BUG-007, luật 7: tổng hợp đổi `from → to` CÓ ĐIỀU KIỆN (0 dòng = bị đổi song song → caller 409);
   * các quan tâm còn ở bước trước `to` được kéo lên `to` — không bao giờ lùi.
   */
  async transition(
    tx: DbTx,
    investorKey: string,
    from: InvestorInterestStatus,
    to: InvestorInterestStatus,
    before: InvestorInterestStatus[],
  ): Promise<boolean> {
    const s = await tx.investorSummary.updateMany({
      where: { investorKey, status: from },
      data: { status: to },
    });
    if (!s.count) return false;
    await tx.investorInterest.updateMany({
      where: { investorKey, status: { in: before } },
      data: { status: to },
    });
    return true;
  }

  /** Tin Admin đầu tiên: Đã gửi → Đang trao đổi (quan tâm + tổng hợp, có điều kiện — IV-R03) */
  async advanceSent(tx: DbTx, investorKey: string): Promise<void> {
    await tx.investorInterest.updateMany({
      where: { investorKey, status: 'sent' },
      data: { status: 'in_discussion' },
    });
    await tx.investorSummary.updateMany({
      where: { investorKey, status: 'sent' },
      data: { status: 'in_discussion' },
    });
  }
}
