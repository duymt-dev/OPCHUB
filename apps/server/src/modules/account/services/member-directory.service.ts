import { Injectable } from '@nestjs/common';
import { Prisma, type DbTx } from '@opchub/db';
import { containsPattern } from '@/common/prisma/like';
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

  byIds(ids: readonly string[], tx?: DbTx) {
    return (tx ?? this.prisma.db).user.findMany({
      where: { id: { in: [...ids] }, deletedAt: null },
      select: { id: true, fullName: true, email: true },
    });
  }

  /** Dùng đúng biểu thức GIN users_search, chỉ trả ID sang domain gọi. */
  async searchIds(q: string, tx?: DbTx): Promise<string[]> {
    const rows = await (tx ?? this.prisma.db).$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT id FROM users WHERE deleted_at IS NULL AND
      (immutable_unaccent(full_name) || ' ' || email::text) ILIKE immutable_unaccent(${containsPattern(q)})`);
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
}
