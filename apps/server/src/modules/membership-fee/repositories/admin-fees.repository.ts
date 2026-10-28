import { Injectable } from '@nestjs/common';
import { type DbTx, Prisma } from '@opchub/db';
import type { MembershipFeeStatus, MembershipPlan } from '@opchub/shared';
import { containsPattern } from '@/common/prisma/like';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface FeeListRow {
  user_id: string;
  member_code: string;
  full_name: string;
  email: string;
  phone: string | null;
  account_type: 'personal' | 'business' | 'investor';
  created_at: Date;
  status: MembershipFeeStatus;
  paid_at: Date | null;
  valid_until: Date | null;
  amount: number;
}

export interface ReminderTarget {
  user_id: string;
  email: string;
  full_name: string;
  status: MembershipFeeStatus;
  valid_until: Date | null;
  amount: number;
}

/**
 * Cột "Nhóm tham gia" (prototype v4.2): tên nhóm đang là thành viên của các dòng trang hiện tại —
 * MỘT query theo lô (idx `group_members (user_id, status)` + PK `groups`), không N+1.
 */
export const feeGroupNamesQuery = (userIds: readonly string[]) => Prisma.sql`
  SELECT gm.user_id, array_agg(g.name ORDER BY g.name) AS names
  FROM group_members gm JOIN groups g ON g.id = gm.group_id
  WHERE gm.user_id = ANY(${[...userIds]}::text[]) AND gm.status = 'member' AND g.deleted_at IS NULL
  GROUP BY gm.user_id`;

/**
 * Màn Phí thành viên (D-18 → D-22). Bảng chính là `membership_fees`; cột hiển thị người lấy qua
 * join 1–1 `users` CHỈ ĐỌC (TIP-B15 §5: deferred join membership_fees + users) — không ghi users.
 */
@Injectable()
export class AdminFeesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Deferred join: subquery chỉ lấy user_id trên idx (status, updated_at) rồi join cột rộng */
  async page(
    status: MembershipFeeStatus | undefined,
    q: string | undefined,
    limit: number,
    offset: number,
  ): Promise<{ rows: FeeListRow[]; total: number }> {
    const byStatus = status
      ? Prisma.sql`AND f.status = ${status}::membership_fee_status`
      : Prisma.empty;
    const search = q
      ? Prisma.sql`AND ((immutable_unaccent(u.full_name) || ' ' || u.email::text)
          ILIKE immutable_unaccent(${containsPattern(q)}) OR u.member_code = upper(${q}))`
      : Prisma.empty;
    const where = Prisma.sql`WHERE u.deleted_at IS NULL AND u.account_type <> 'investor'
      ${byStatus} ${search}`;
    const [rows, count] = await Promise.all([
      this.prisma.db.$queryRaw<FeeListRow[]>`
        SELECT u.id AS user_id, u.member_code, u.full_name, u.email::text AS email, u.phone,
               u.account_type, u.created_at, f.status, f.paid_at, f.valid_until, f.amount
        FROM (
          SELECT f.user_id FROM membership_fees f JOIN users u ON u.id = f.user_id
          ${where}
          ORDER BY f.updated_at DESC, f.user_id LIMIT ${limit} OFFSET ${offset}
        ) page
        JOIN membership_fees f ON f.user_id = page.user_id
        JOIN users u ON u.id = page.user_id
        ORDER BY f.updated_at DESC, f.user_id`,
      this.prisma.db.$queryRaw<{ n: bigint }[]>`
        SELECT count(*) AS n FROM membership_fees f JOIN users u ON u.id = f.user_id ${where}`,
    ]);
    return { rows, total: Number(count[0]?.n ?? 0) };
  }

  byUserIds(
    userIds: readonly string[],
    db: DbTx | PrismaService['db'] = this.prisma.db,
  ): Promise<FeeListRow[]> {
    if (!userIds.length) return Promise.resolve([]);
    return db.$queryRaw<FeeListRow[]>`
      SELECT u.id AS user_id, u.member_code, u.full_name, u.email::text AS email, u.phone,
             u.account_type, u.created_at, f.status, f.paid_at, f.valid_until, f.amount
      FROM membership_fees f JOIN users u ON u.id = f.user_id
      WHERE f.user_id = ANY(${[...userIds]}::text[]) AND u.deleted_at IS NULL`;
  }

  /** Tên nhóm theo lô `user_id` của trang (`feeGroupNamesQuery`) */
  async groupNames(userIds: readonly string[]): Promise<Map<string, string[]>> {
    if (!userIds.length) return new Map();
    const rows = await this.prisma.db.$queryRaw<{ user_id: string; names: string[] }[]>(
      feeGroupNamesQuery(userIds),
    );
    return new Map(rows.map((r) => [r.user_id, r.names]));
  }

  /**
   * Đếm theo trạng thái × gói (TK không phải NĐT). D-101: doanh thu thẻ "Doanh thu phí năm" tính ở service
   * = Σ giá năm hiện hành theo gói của TV `active` + `expiring` (không cộng kỳ phí lịch sử).
   */
  summary(): Promise<{ status: MembershipFeeStatus; plan: MembershipPlan; n: bigint }[]> {
    return this.prisma.db.$queryRaw`
      SELECT f.status, f.plan, count(*) AS n FROM membership_fees f JOIN users u ON u.id = f.user_id
      WHERE u.deleted_at IS NULL AND u.account_type <> 'investor' GROUP BY f.status, f.plan`;
  }

  /** Người cần nhắc (NA-04 "Gửi nhắc hàng loạt" — prototype v4.2: mọi TV chưa `active`, gồm trial) */
  needReminder() {
    return this.prisma.db.$queryRaw<ReminderTarget[]>`
      SELECT u.id AS user_id, u.email::text AS email, u.full_name, f.status, f.valid_until, f.amount
      FROM membership_fees f JOIN users u ON u.id = f.user_id
      WHERE f.status IN ('trial', 'pending_payment', 'expiring', 'expired') AND u.deleted_at IS NULL
        AND u.account_type <> 'investor' AND u.status = 'active'`;
  }

  /** Hàng đợi giao dịch không khớp — keyset theo received_at (partial idx payment_tx_unmatched) */
  unmatched(before: Date | null, limit: number) {
    return this.prisma.db.paymentTransaction.findMany({
      where: { matchStatus: 'unmatched', ...(before ? { receivedAt: { lt: before } } : {}) },
      orderBy: { receivedAt: 'desc' },
      take: limit,
      select: { id: true, amount: true, content: true, receivedAt: true, raw: true },
    });
  }
}
