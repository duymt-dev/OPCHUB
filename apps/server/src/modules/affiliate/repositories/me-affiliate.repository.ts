import { payoutGroup, payoutPageQuery, referralPageQuery } from './me-affiliate.query';
import { referralRowsSummary } from './referral-rows.query';
import { commissionVisible } from './commission-visible.sql';
import { Injectable } from '@nestjs/common';
import { Prisma, type AffiliateStatus } from '@opchub/db';
import type { AffiliateBank, AffiliatePageQuery, CommissionPlan } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';

interface ReferralRow {
  customerYear: number;
  source: 'membership' | 'fundraising';
  id: string;
  customerId: string;
  date: Date;
  feeAmount: number;
  commission: number;
  rate: number;
  status: 'pending' | 'void' | 'recorded' | 'paid' | 'cancelled';
  cancelReason: string | null;
  /** null: referral chưa có khoản (khách chưa đóng phí) */
  plan: CommissionPlan | null;
}

@Injectable()
export class MeAffiliateRepository {
  constructor(private readonly prisma: PrismaService) {}

  byUser(userId: string) {
    return this.prisma.db.affiliate.findUnique({
      where: { userId },
      select: {
        id: true,
        code: true,
        rate: true,
        status: true,
        bankName: true,
        bankNo: true,
        bankHolder: true,
      },
    });
  }

  bank(userId: string, bank: AffiliateBank) {
    return this.prisma.db.affiliate.update({
      where: { userId },
      data: bank,
      select: { bankName: true, bankNo: true, bankHolder: true },
    });
  }

  async stats(affiliateId: string, month: string, since: Date) {
    const [clicks, [r]] = await Promise.all([
      this.prisma.db.affiliateClickDaily.aggregate({
        where: { affiliateId, day: { gte: since } },
        _sum: { count: true },
      }),
      this.prisma.db.$queryRaw<
        { paidCount: number; thisMonth: bigint; carryOver: bigint; received: bigint }[]
      >(Prisma.sql`
        SELECT count(*) FILTER (WHERE status <> 'cancelled')::integer AS "paidCount",
          COALESCE(sum(amount) FILTER (WHERE month_key = ${month} AND status <> 'cancelled'),0)::bigint AS "thisMonth",
          COALESCE(sum(amount) FILTER (WHERE month_key < ${month} AND status = 'recorded'),0)::bigint AS "carryOver",
          COALESCE(sum(amount) FILTER (WHERE status = 'paid'),0)::bigint AS received
        FROM commissions c WHERE ${commissionVisible} AND affiliate_id = ${affiliateId}`),
    ]);
    const clicks30d = clicks._sum.count ?? 0;
    const paidCount = r?.paidCount ?? 0;
    return {
      clicks30d,
      paidCount,
      conversionPct: clicks30d ? Math.round((paidCount / clicks30d) * 1000) / 10 : 0,
      thisMonth: Number(r?.thisMonth ?? 0),
      carryOver: Number(r?.carryOver ?? 0),
      received: Number(r?.received ?? 0),
    };
  }

  async referrals(affiliateId: string, q: AffiliatePageQuery) {
    const [items, [summary], months] = await Promise.all([
      this.prisma.db.$queryRaw<ReferralRow[]>(referralPageQuery(affiliateId, q)),
      this.prisma.db.$queryRaw<
        { count: number; commission: bigint; recorded: number; paid: number }[]
      >(referralRowsSummary(affiliateId, q)),
      this.prisma.db.$queryRaw<{ month: string }[]>(Prisma.sql`
        SELECT month_key AS month FROM commissions c WHERE ${commissionVisible} AND affiliate_id = ${affiliateId}
        UNION SELECT r.month_key AS month FROM referrals r WHERE r.affiliate_id = ${affiliateId}
          AND (r.status IN ('pending','void') OR NOT EXISTS (SELECT 1 FROM commissions c
            WHERE ${commissionVisible} AND c.affiliate_id=${affiliateId} AND c.referred_user_id=r.referred_user_id)) ORDER BY month DESC`),
    ]);
    return {
      items,
      months: months.map((m) => m.month),
      summary: {
        count: summary?.count ?? 0,
        commission: Number(summary?.commission ?? 0),
        status: summary?.recorded ? 'recorded' : summary?.paid ? 'paid' : 'pending',
      },
    };
  }

  async payouts(affiliateId: string, q: AffiliatePageQuery) {
    const group = payoutGroup(affiliateId);
    const [rows, [count]] = await Promise.all([
      this.prisma.db.$queryRaw<
        { monthKey: string; amount: bigint; count: number; paidAt: Date; bank: unknown }[]
      >(payoutPageQuery(affiliateId, q)),
      this.prisma.db.$queryRaw<{ total: number }[]>(Prisma.sql`SELECT count(*)::integer AS total
        FROM (SELECT month_key ${group}) periods`),
    ]);
    return { rows, total: count?.total ?? 0 };
  }
}

export type AffiliateSelfRow = {
  id: string;
  code: string;
  rate: number;
  status: AffiliateStatus;
  bankName: string | null;
  bankNo: string | null;
  bankHolder: string | null;
};
