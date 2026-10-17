import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { FeeSnapshot } from '../account';

/** Bảng membership_fees — chỉ domain membership-fee đọc/ghi (B14 mở rộng) */
@Injectable()
export class MembershipFeeRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCurrent(userId: string): Promise<FeeSnapshot | null> {
    return this.prisma.db.membershipFee.findUnique({
      where: { userId },
      select: { status: true, validUntil: true, amount: true },
    });
  }
}
