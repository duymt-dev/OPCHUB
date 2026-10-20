import { affiliateCustomersQuery, affiliateMonthsQuery } from './affiliate-history.query';
import { Injectable } from '@nestjs/common';
import { Prisma, type AffiliateStatus, type DbTx } from '@opchub/db';
import type { AffiliatePageQuery } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import { affiliatePageQuery, affiliateWhere } from './affiliate-admin.query';

export interface AffiliateListRow {
  id: string;
  userId: string;
  code: string;
  rate: number;
  status: AffiliateStatus;
  date: Date;
  hasBank: boolean;
  bankName: string | null;
  bankNo: string | null;
  bankHolder: string | null;
}
export interface AffiliateTotals {
  affiliateId: string;
  customers: number;
  revenue: bigint;
  balance: bigint;
  paid: bigint;
  commission: bigint;
}

@Injectable()
export class AffiliateAdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  page(
    q: AffiliatePageQuery,
    memberIds: readonly string[],
    ids?: readonly string[],
    after?: { date: Date; id: string },
    tx?: DbTx,
  ) {
    return (tx ?? this.prisma.db).$queryRaw<AffiliateListRow[]>(
      affiliatePageQuery(q, memberIds, ids, after),
    );
  }

  countIds(tx: DbTx, ids: readonly string[]) {
    return tx.affiliate.count({ where: { id: { in: [...new Set(ids)] } } });
  }

  async count(q: AffiliatePageQuery, memberIds: readonly string[]) {
    const [r] = await this.prisma.db.$queryRaw<{ total: number }[]>(Prisma.sql`
      SELECT count(*)::integer AS total FROM affiliates a ${affiliateWhere(q, memberIds)}`);
    return r?.total ?? 0;
  }

  byId(id: string) {
    return this.prisma.db.affiliate.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        code: true,
        rate: true,
        status: true,
        createdAt: true,
        bankName: true,
        bankNo: true,
        bankHolder: true,
      },
    });
  }

  totals(ids: readonly string[], month?: string, tx?: DbTx) {
    if (!ids.length) return Promise.resolve<AffiliateTotals[]>([]);
    return (tx ?? this.prisma.db).$queryRaw<AffiliateTotals[]>(Prisma.sql`
      SELECT affiliate_id AS "affiliateId",count(*)::integer AS customers,
        sum(list_amount)::bigint AS revenue,sum(amount)::bigint AS commission,
        COALESCE(sum(amount) FILTER (WHERE status='recorded'),0)::bigint AS balance,
        COALESCE(sum(amount) FILTER (WHERE status='paid'),0)::bigint AS paid
      FROM commissions WHERE affiliate_id=ANY(${[...ids]}::text[]) AND status IN ('recorded','paid')
        ${month ? Prisma.sql`AND month_key=${month}` : Prisma.empty} GROUP BY affiliate_id`);
  }

  async months(id: string, q: AffiliatePageQuery) {
    const [items, [total]] = await Promise.all([
      this.prisma.db.$queryRaw<
        {
          monthKey: string;
          customers: number;
          amount: bigint;
          payable: bigint;
          paidAt: Date | null;
          status: 'recorded' | 'paid' | 'cancelled' | 'mixed';
        }[]
      >(affiliateMonthsQuery(id, q)),
      this.prisma.db.$queryRaw<
        { total: number }[]
      >`SELECT count(DISTINCT month_key)::integer AS total
        FROM commissions WHERE affiliate_id=${id}`,
    ]);
    return { items, total: total?.total ?? 0 };
  }

  async customers(id: string, q: AffiliatePageQuery) {
    const [items, total] = await Promise.all([
      this.prisma.db.$queryRaw<
        {
          id: string;
          customerId: string;
          date: Date;
          feeAmount: number;
          commission: number;
          rate: number;
          status: 'recorded' | 'paid' | 'cancelled';
          cancelReason: string | null;
          paidAt: Date | null;
          bank: unknown;
        }[]
      >(affiliateCustomersQuery(id, q)),
      this.prisma.db.commission.count({ where: { affiliateId: id } }),
    ]);
    return { items, total };
  }
}
