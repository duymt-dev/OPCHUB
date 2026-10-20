import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

/** Cổng backfill Affiliate: chỉ TV có kỳ phí thật, không gồm hồ sơ Admin/NĐT/xoá mềm. */
@Injectable()
export class PaidMembersRepository {
  constructor(private readonly prisma: PrismaService) {}

  page(after: string | undefined, size: number) {
    return this.prisma.db.membershipFee.findMany({
      where: {
        ...(after ? { userId: { gt: after } } : {}),
        user: {
          deletedAt: null,
          accountType: { not: 'investor' },
          feePeriods: { some: {} },
        },
      },
      select: {
        userId: true,
        status: true,
        validUntil: true,
        user: { select: { fullName: true } },
      },
      orderBy: { userId: 'asc' },
      take: size,
    });
  }
}
