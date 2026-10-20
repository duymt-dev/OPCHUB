import { Injectable } from '@nestjs/common';
import type { AffiliateStatus, DbTx } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class ReferralRepository {
  constructor(private readonly prisma: PrismaService) {}

  async code(code: string, tx?: DbTx) {
    const db = tx ?? this.prisma.db;
    if (tx) {
      const rows = await tx.$queryRaw<
        { id: string; userId: string; code: string; status: AffiliateStatus }[]
      >`
        SELECT id, user_id AS "userId", code, status::text AS status
        FROM affiliates WHERE code = ${code} FOR UPDATE`;
      return rows[0] ?? null;
    }
    return db.affiliate.findUnique({
      where: { code },
      select: { id: true, userId: true, code: true, status: true },
    });
  }

  async click(affiliateId: string, day: Date): Promise<void> {
    await this.prisma.db.affiliateClickDaily.upsert({
      where: { affiliateId_day: { affiliateId, day } },
      create: { affiliateId, day, count: 1 },
      update: { count: { increment: 1 } },
    });
  }
}
