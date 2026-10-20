import { Injectable } from '@nestjs/common';
import { Prisma, type CommissionStatus, type DbTx } from '@opchub/db';
import type { AffiliateCommissionQuery } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  commissionPageQuery,
  commissionWhere,
  type CommissionPageOptions,
} from './commission-admin.query';

export interface AdminCommissionRow {
  id: string;
  affiliateId: string;
  customerId: string;
  affiliateUserId: string;
  code: string;
  date: Date;
  feeAmount: number;
  rate: number;
  amount: number;
  status: CommissionStatus;
  cancelReason: string | null;
}

@Injectable()
export class CommissionAdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  page(
    q: AffiliateCommissionQuery,
    memberIds: readonly string[],
    options: CommissionPageOptions = {},
    tx?: DbTx,
  ) {
    return (tx ?? this.prisma.db).$queryRaw<AdminCommissionRow[]>(
      commissionPageQuery(q, memberIds, options),
    );
  }

  countIds(tx: DbTx, ids: readonly string[]) {
    return tx.commission.count({ where: { id: { in: [...new Set(ids)] } } });
  }

  async count(q: AffiliateCommissionQuery, memberIds: readonly string[]) {
    const [r] = await this.prisma.db.$queryRaw<{ total: number }[]>(Prisma.sql`
      SELECT count(*)::integer AS total FROM commissions c ${commissionWhere(q, memberIds)}`);
    return r?.total ?? 0;
  }

  async summary(month?: string) {
    const [r] = await this.prisma.db.$queryRaw<
      { revenue: bigint; totalCommission: bigint; payable: bigint; paid: bigint }[]
    >(Prisma.sql`
      SELECT COALESCE(sum(list_amount),0)::bigint AS revenue,COALESCE(sum(amount),0)::bigint AS "totalCommission",
        COALESCE(sum(amount) FILTER (WHERE status='recorded'),0)::bigint AS payable,
        COALESCE(sum(amount) FILTER (WHERE status='paid'),0)::bigint AS paid
      FROM commissions WHERE status IN ('recorded','paid') ${month ? Prisma.sql`AND month_key=${month}` : Prisma.empty}`);
    const revenue = Number(r?.revenue ?? 0),
      totalCommission = Number(r?.totalCommission ?? 0);
    return {
      revenue,
      totalCommission,
      payable: Number(r?.payable ?? 0),
      paid: Number(r?.paid ?? 0),
      netRevenue: revenue - totalCommission,
    };
  }
}
