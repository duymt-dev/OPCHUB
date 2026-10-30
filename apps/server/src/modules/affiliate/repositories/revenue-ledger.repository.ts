import { Injectable } from '@nestjs/common';
import type {
  RevenueBalance,
  RevenueLedgerItem,
  RevenueLedgerQuery,
  RevenueMonthsQuery,
} from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  revenueBalanceQuery,
  revenueLedgerQuery,
  revenueMonthsQuery,
} from './revenue-ledger.query';

export type RevenueLedgerRow = Omit<
  RevenueLedgerItem,
  'customerName' | 'affiliateName' | 'receivedAt' | 'recordedAt' | 'firstReceivedAt'
> & { receivedAt: Date; recordedAt: Date; firstReceivedAt: Date };

@Injectable()
export class RevenueLedgerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async knownDirector(directorId: string) {
    const db = this.prisma.db;
    if (
      await db.regionalDirector.findUnique({
        where: { userId: directorId },
        select: { region: true },
      })
    )
      return true;
    if (
      await db.revenueRecipientBank.findUnique({
        where: { directorId },
        select: { directorId: true },
      })
    )
      return true;
    return Boolean(
      await db.revenueShare.findFirst({ where: { directorId }, select: { id: true } }),
    );
  }

  ledger(directorId: string, q: RevenueLedgerQuery) {
    return this.prisma.db.$queryRaw<RevenueLedgerRow[]>(revenueLedgerQuery(directorId, q));
  }

  async balance(directorId: string) {
    const [row] = await this.prisma.db.$queryRaw<RevenueBalance[]>(revenueBalanceQuery(directorId));
    if (!row) throw new Error('Missing revenue aggregate');
    return row;
  }

  months(directorId: string, q: RevenueMonthsQuery) {
    return this.prisma.db.$queryRaw<(RevenueBalance & { monthKey: string })[]>(
      revenueMonthsQuery(directorId, q),
    );
  }

  affiliates(ids: string[]) {
    return this.prisma.db.affiliate.findMany({
      where: { id: { in: ids } },
      select: { id: true, userId: true },
    });
  }
}
