import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import type { AdminMemberFilter } from '@opchub/shared/api-domains';
import type { UserStatus } from '@opchub/shared';
import { Prisma } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';
import { adminMemberWhere } from './admin-member-filter.sql';

/** V4-612: hạn + loại khoá (khoá không hạn = `until: null`); `onlyAuto` khi mở khoá do Khôi phục tin */
export interface StatusLock {
  until: Date | null;
  kind: 'manual' | 'auto';
  onlyAuto?: boolean;
  /** Tự mở khoá: chỉ TK có hạn đã qua mốc này (không mở nhầm TK vừa bị khoá lại) */
  expiredAt?: Date;
}

/** Cột hiển thị bảng + drawer thành viên (D-07 → D-17) */
export const ADMIN_MEMBER_SELECT = {
  id: true,
  accountType: true,
  fullName: true,
  email: true,
  phone: true,
  country: true,
  registrationRole: true,
  status: true,
  createdAt: true,
  businessProfile: {
    select: {
      taxCode: true,
      companyName: true,
      mainField: true,
      size: true,
      country: true,
      position: true,
      verification: true,
    },
  },
} as const;

export type AdminMemberRow = Prisma.UserGetPayload<{ select: typeof ADMIN_MEMBER_SELECT }>;

const LISTED_TYPES = ['personal', 'business'] as const;

/** Bảng users cho màn Thành viên — không liệt kê investor, TK đã xoá (TK quản trị ở `admin_users`) */
@Injectable()
export class AdminUsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deferred join (query-indexing.md): subquery chỉ lấy `id` trên index covering
   * `users_list` / `users_list_all` (hoặc GIN `users_search` khi có `q`), rồi join lấy cột rộng.
   * D-52: `users` chỉ còn thành viên/NĐT (TK quản trị ở `admin_users`). Bộ lọc v4: `adminMemberWhere`.
   */
  async pageIds(
    f: AdminMemberFilter,
    limit: number,
    offset: number,
    now = new Date(),
  ): Promise<{ ids: string[]; total: number }> {
    const where = adminMemberWhere(f, now);
    const [rows, count] = await Promise.all([
      this.prisma.db.$queryRaw<{ id: string }[]>`
        SELECT id FROM users ${where}
        ORDER BY created_at DESC, id DESC LIMIT ${limit} OFFSET ${offset}`,
      this.prisma.db.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM users ${where}`,
    ]);
    return { ids: rows.map((r) => r.id), total: Number(count[0]?.n ?? 0) };
  }

  async byIds(ids: readonly string[]): Promise<AdminMemberRow[]> {
    if (!ids.length) return [];
    const rows = await this.prisma.db.user.findMany({
      where: { id: { in: [...ids] } },
      select: ADMIN_MEMBER_SELECT,
    });
    const order = new Map(ids.map((id, i) => [id, i]));
    return rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }

  /** Số đếm chip lọc — không phụ thuộc `q` */
  async counts(): Promise<{ all: number; business: number; personal: number }> {
    const rows = await this.prisma.db.user.groupBy({
      by: ['accountType'],
      where: {
        accountType: { in: [...LISTED_TYPES] },
        deletedAt: null,
      },
      _count: { _all: true },
    });
    const n = (t: string) => rows.find((r) => r.accountType === t)?._count._all ?? 0;
    return { all: n('personal') + n('business'), business: n('business'), personal: n('personal') };
  }

  /**
   * Khoá/mở có điều kiện (rule 8): chỉ TK đang ở trạng thái ngược lại.
   * Tăng perm_version để token cũ hết hiệu lực. Trả các dòng thật sự đổi.
   */
  setStatus(
    tx: DbTx,
    ids: readonly string[],
    status: UserStatus,
    reason: string | null,
    lock: StatusLock = { until: null, kind: 'manual' },
  ) {
    const from = status === 'locked' ? 'active' : 'locked';
    // V4-612: khoá ghi hạn + loại; mở xoá cả hai. `onlyAuto` — Khôi phục tin chỉ mở khoá tự động
    const until = status === 'locked' ? lock.until : null;
    const kind = status === 'locked' ? lock.kind : null;
    const onlyAuto =
      status === 'active' && lock.onlyAuto ? Prisma.sql`AND lock_kind = 'auto'` : Prisma.empty;
    const expired =
      status === 'active' && lock.expiredAt
        ? Prisma.sql`AND locked_until IS NOT NULL AND locked_until <= ${lock.expiredAt}`
        : Prisma.empty;
    return tx.$queryRaw<{ id: string; perm_version: number; full_name: string }[]>`
      UPDATE users SET status = ${status}::user_status, locked_reason = ${reason},
        locked_until = ${until}, lock_kind = ${kind}::user_lock_kind,
        perm_version = perm_version + 1, updated_at = now()
      WHERE id = ANY(${[...ids]}::text[]) AND status = ${from}::user_status
        AND deleted_at IS NULL ${onlyAuto} ${expired}
      RETURNING id, perm_version, full_name`;
  }

  /** V4-612 tự mở khoá: TK khoá có hạn đã hết hạn (idx partial `users_lock_expiry`), theo lô */
  expiredLocks(now: Date, limit: number): Promise<{ id: string }[]> {
    return this.prisma.db.$queryRaw<{ id: string }[]>`
      SELECT id FROM users
      WHERE status = 'locked' AND locked_until IS NOT NULL AND locked_until <= ${now}
      ORDER BY locked_until LIMIT ${limit}`;
  }

  /** D-40: chỉ `pending` → verified|rejected */
  async decideVerification(
    tx: DbTx,
    userId: string,
    to: 'verified' | 'rejected',
    at: Date,
  ): Promise<boolean> {
    const r = await tx.businessProfile.updateMany({
      where: { userId, verification: 'pending' },
      data: { verification: to, verifiedAt: to === 'verified' ? at : null },
    });
    return r.count === 1;
  }
}
