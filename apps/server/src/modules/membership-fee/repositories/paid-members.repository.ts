import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { MembershipFeeStatus } from '@opchub/shared';
import { paidMembersQuery } from './paid-members.query';

/** Cổng backfill Affiliate: chỉ TV có kỳ phí thật, không gồm hồ sơ Admin/NĐT/xoá mềm. */
@Injectable()
export class PaidMembersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async page(after: string | undefined, size: number) {
    const rows = await this.prisma.db.$queryRaw<
      {
        userId: string;
        status: MembershipFeeStatus;
        validUntil: Date | null;
        fullName: string;
      }[]
    >(paidMembersQuery(after, size));
    return rows.map(({ fullName, ...r }) => ({ ...r, user: { fullName } }));
  }
}
