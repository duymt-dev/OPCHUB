import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { memberSearchQuery } from '../repositories/member-search.query';
import {
  memberLifecycleQuery,
  type MemberLifecycleRow,
} from '../repositories/member-lifecycle.query';
import type { AccountType } from '@opchub/shared';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface MemberContact {
  id: string;
  memberCode: string;
  fullName: string;
  email: string;
  phone: string | null;
  accountType: AccountType;
}

const SELECT = {
  id: true,
  memberCode: true,
  fullName: true,
  email: true,
  phone: true,
  accountType: true,
} as const;

/** API công khai của account cho domain khác (phí, đối soát…) — không đọc bảng users trực tiếp */
@Injectable()
export class MemberDirectory {
  constructor(private readonly prisma: PrismaService) {}

  /** Lifecycle consumers recheck current state under a share lock, not stale event data. */
  lockLifecycle(tx: DbTx, ids: readonly string[]) {
    return tx.$queryRaw<MemberLifecycleRow[]>(memberLifecycleQuery(ids));
  }

  byIds(ids: readonly string[], tx?: DbTx) {
    return (tx ?? this.prisma.db).user.findMany({
      where: { id: { in: [...ids] }, deletedAt: null },
      select: { id: true, fullName: true, email: true },
    });
  }

  /** Dùng đúng biểu thức GIN users_search, chỉ trả ID sang domain gọi. */
  async searchIds(q: string, tx?: DbTx): Promise<string[]> {
    const rows = await (tx ?? this.prisma.db).$queryRaw<{ id: string }[]>(memberSearchQuery(q));
    return rows.map((r) => r.id);
  }

  byId(userId: string, tx?: DbTx): Promise<MemberContact | null> {
    return (tx ?? this.prisma.db).user.findFirst({
      where: { id: userId, deletedAt: null },
      select: SELECT,
    });
  }

  /** RB-R02 / AT-RB01: email đã là TK thành viên chưa xoá (citext — không phân biệt hoa thường) */
  async emailTaken(email: string): Promise<boolean> {
    const row = await this.prisma.db.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true },
    });
    return row !== null;
  }

  /** UQ member_code (D-41) */
  byMemberCode(memberCode: string): Promise<MemberContact | null> {
    return this.prisma.db.user.findFirst({
      where: { memberCode, deletedAt: null },
      select: SELECT,
    });
  }

  /** V4-608 (UP-03): dữ liệu khởi tạo gian hàng — hồ sơ DN (tên công ty, tỉnh, web, địa chỉ) */
  businessSeed(userId: string, tx?: DbTx) {
    return (tx ?? this.prisma.db).user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        accountType: true,
        fullName: true,
        email: true,
        phone: true,
        city: true,
        businessProfile: {
          select: { companyName: true, province: true, website: true, address: true },
        },
      },
    });
  }
}
