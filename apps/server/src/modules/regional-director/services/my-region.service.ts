import { Injectable } from '@nestjs/common';
import { regionalPayoutDate, regionalPercent } from '@opchub/shared';
import { REGIONAL_LABELS, type MyRegion } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AffiliateShareReader } from '@/modules/affiliate';
import { MyRegionProjectionRepository } from '@/modules/reporting';

@Injectable()
export class MyRegionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projection: MyRegionProjectionRepository,
    private readonly affiliate: AffiliateShareReader,
  ) {}
  read(userId: string, now = new Date()): Promise<MyRegion> {
    return this.prisma.db.$transaction(async (tx) => {
      const slot = await tx.regionalDirector.findUnique({
        where: { userId },
        select: {
          region: true,
          bankName: true,
          bankNo: true,
          bankHolder: true,
          provinces: { select: { province: true } },
        },
      });
      if (!slot) return { state: 'none' };
      const policy = await this.affiliate.policyAt(tx);
      const rows = await this.projection.read(tx, slot.region, userId);
      const k = rows.kpi;
      const share = Number(k?.share ?? 0),
        paid = Number(k?.paid ?? 0);
      return {
        state: 'director',
        region: slot.region,
        label: REGIONAL_LABELS[slot.region],
        provinces: slot.provinces.map((p) => p.province),
        bank:
          slot.bankName && slot.bankNo && slot.bankHolder
            ? { bankName: slot.bankName, bankNo: slot.bankNo, bankHolder: slot.bankHolder }
            : null,
        kpi: {
          count: k?.count ?? 0,
          revenue: Number(k?.revenue ?? 0),
          share,
          paid,
          due: share - paid,
          paidMonths: k?.paidMonths ?? 0,
        },
        years: [1, 2, 3, 4].map((year) => {
          const row = rows.years.find((r) => r.year === year);
          return {
            year,
            percent: regionalPercent(year, policy),
            count: row?.count ?? 0,
            revenue: Number(row?.revenue ?? 0),
            share: Number(row?.share ?? 0),
          };
        }),
        affiliates: rows.affiliates.map((r) => ({
          id: r.id,
          name: r.name,
          code: r.code,
          customers: r.customers,
          revenue: Number(r.revenue),
          share: Number(r.share),
        })),
        more: Math.max(0, (rows.affiliates[0]?.total ?? 0) - 50),
        months: rows.months.map((r) => ({
          ...r,
          amount: Number(r.amount),
          paidAt: r.paidAt?.toISOString() ?? null,
        })),
        payoutDate: regionalPayoutDate(now),
      };
    });
  }
}
