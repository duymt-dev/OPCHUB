import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import type { AffiliatePolicy } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';

const SELECT = { defaultRate: true, cookieDays: true, terms: true } as const;
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
}
