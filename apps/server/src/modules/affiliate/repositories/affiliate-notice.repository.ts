import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class AffiliateNoticeRepository {
  constructor(private readonly prisma: PrismaService) {}

  cancelled(ids: string[]) {
    return this.prisma.db.$queryRaw<{ id: string; userId: string }[]>`
      SELECT c.id,a.user_id AS "userId" FROM commissions c JOIN affiliates a ON a.id=c.affiliate_id
      WHERE c.id=ANY(${ids}::text[]) AND c.status='cancelled'`;
  }

  rates(ids: string[]) {
    return this.prisma.db.affiliate.findMany({
      where: { id: { in: ids } },
      select: { id: true, userId: true },
    });
  }

  async payout(affiliateId: string, month: string, payoutId: string) {
    const rows = await this.prisma.db.$queryRaw<
      { userId: string; amount: bigint; count: number; bank: unknown }[]
    >`
      SELECT a.user_id AS "userId",sum(c.amount)::bigint AS amount,count(*)::integer AS count,
        c.paid_bank_snapshot AS bank FROM commissions c JOIN affiliates a ON a.id=c.affiliate_id
      WHERE c.affiliate_id=${affiliateId} AND c.month_key=${month} AND c.status='paid'
        AND c.paid_bank_snapshot->>'payoutId'=${payoutId}
      GROUP BY a.user_id,c.paid_bank_snapshot`;
    return rows[0] ?? null;
  }
}
