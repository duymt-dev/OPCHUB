import { Injectable } from '@nestjs/common';
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

  byId(userId: string): Promise<MemberContact | null> {
    return this.prisma.db.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: SELECT,
    });
  }

  /** UQ member_code (D-41) */
  byMemberCode(memberCode: string): Promise<MemberContact | null> {
    return this.prisma.db.user.findFirst({
      where: { memberCode, deletedAt: null },
      select: SELECT,
    });
  }
}
