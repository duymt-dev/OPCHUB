import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import type { AffiliatePolicy } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';

const SELECT = {
  defaultRate: true,
  cookieDays: true,
  fundraisingRate: true,
  terms: true,
  regionalFirstYear: true,
  regionalStep: true,
  regionalMin: true,
} as const;
@Injectable()
export class PolicyRepository {
  constructor(private readonly prisma: PrismaService) {}

  get(tx?: DbTx): Promise<AffiliatePolicy> {
    return (tx ?? this.prisma.db).affiliatePolicy.findUniqueOrThrow({
      where: { id: 1 },
      select: SELECT,
    });
  }

  update(tx: DbTx, data: AffiliatePolicy): Promise<AffiliatePolicy> {
    return tx.affiliatePolicy.update({ where: { id: 1 }, data, select: SELECT });
  }

  async lock(tx: DbTx): Promise<AffiliatePolicy> {
    const [row] = await tx.$queryRaw<AffiliatePolicy[]>`
      SELECT default_rate AS "defaultRate",cookie_days AS "cookieDays",
        fundraising_rate AS "fundraisingRate",terms, regional_first_year AS "regionalFirstYear",
        regional_step AS "regionalStep", regional_min AS "regionalMin" FROM affiliate_policy
      WHERE id=1 FOR UPDATE`;
    if (!row) throw new Error('Thiếu chính sách Affiliate bắt buộc');
    return row;
  }
}
