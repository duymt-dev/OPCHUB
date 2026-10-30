import { Injectable } from '@nestjs/common';
import type { DirectorRegion, RevenueFormerQuery, RevenueStats } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import { revenueDashboardStatsQuery, revenueFormerQuery } from './revenue-dashboard.query';

export interface FormerRevenueDirector {
  directorId: string;
  name: string;
  region: DirectorRegion;
  bankName: string | null;
  bankNo: string | null;
  bankHolder: string | null;
}

@Injectable()
export class RevenueDashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  stats(ids: string[]) {
    return this.prisma.db.$queryRaw<(RevenueStats & { directorId: string | null })[]>(
      revenueDashboardStatsQuery(ids),
    );
  }

  former(q: RevenueFormerQuery) {
    return this.prisma.db.$queryRaw<FormerRevenueDirector[]>(revenueFormerQuery(q));
  }

  policy() {
    return this.prisma.db.affiliatePolicy.findUniqueOrThrow({
      where: { id: 1 },
      select: { yearOneRate: true, annualDecrease: true, minimumRate: true },
    });
  }
}
