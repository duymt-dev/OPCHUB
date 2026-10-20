import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
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
