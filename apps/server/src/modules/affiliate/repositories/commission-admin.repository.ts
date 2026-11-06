import { Injectable } from '@nestjs/common';
import { Prisma, type CommissionPlan, type CommissionStatus, type DbTx } from '@opchub/db';
import type { AffiliateCommissionQuery } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import { commissionVisible } from './commission-visible.sql';
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
  customerYear: number;
  amount: number;
  status: CommissionStatus;
  cancelReason: string | null;
  plan: CommissionPlan;
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
    return tx.commission.count({ where: { id: { in: [...new Set(ids)] }, amount: { gt: 0 } } });
  }

  async count(q: AffiliateCommissionQuery, memberIds: readonly string[]) {
    const [r] = await this.prisma.db.$queryRaw<{ total: number }[]>(Prisma.sql`
      SELECT count(*)::integer AS total FROM commissions c ${commissionWhere(q, memberIds)}`);
    return r?.total ?? 0;
  }

  async summary(month?: string) {
    const [r] = await this.prisma.db.$queryRaw<
      {
        revenue: bigint;
        totalCommission: bigint;
        payable: bigint;
        paid: bigint;
        business: number;
        personal: number;
        fundraising: number;
      }[]
    >(Prisma.sql`
      SELECT COALESCE(sum(list_amount),0)::bigint AS revenue,COALESCE(sum(amount),0)::bigint AS "totalCommission",
        COALESCE(sum(amount) FILTER (WHERE status='recorded'),0)::bigint AS payable,
        COALESCE(sum(amount) FILTER (WHERE status='paid'),0)::bigint AS paid,
        (count(*) FILTER (WHERE plan='business'))::integer AS business,
        (count(*) FILTER (WHERE plan='personal'))::integer AS personal,
        (count(*) FILTER (WHERE plan='fundraising'))::integer AS fundraising
      FROM commissions c WHERE ${commissionVisible} AND status IN ('recorded','paid') ${month ? Prisma.sql`AND month_key=${month}` : Prisma.empty}`);
    const revenue = Number(r?.revenue ?? 0),
      totalCommission = Number(r?.totalCommission ?? 0);
    return {
      revenue,
      totalCommission,
      payable: Number(r?.payable ?? 0),
      paid: Number(r?.paid ?? 0),
      plans: {
        business: r?.business ?? 0,
        personal: r?.personal ?? 0,
        fundraising: r?.fundraising ?? 0,
      },
    };
  }
}
