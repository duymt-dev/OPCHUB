import { Injectable } from '@nestjs/common';
import type { DbTx, Prisma } from '@opchub/db';
import type { RevenuePayoutHistoryQuery } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import { revenuePayoutHistoryQuery } from './revenue-payout-history.query';
import { revenuePayoutLockQuery } from './revenue-payout-lock.query';
import { RegionalDirectorBankRepository } from './regional-director-bank.repository';

export type PayableShare = Pick<
  Prisma.RevenueShareGetPayload<true>,
  | 'id'
  | 'directorName'
  | 'region'
  | 'directorAmount'
  | 'bankName'
  | 'bankNo'
  | 'bankHolder'
  | 'recordedAt'
>;
export type PayoutRow = Omit<
  Prisma.RevenuePayoutGetPayload<true>,
  'requestKey' | 'createdAt' | 'updatedAt'
>;
const receiptSelect = {
  id: true,
  directorId: true,
  directorName: true,
  region: true,
  monthKey: true,
  amount: true,
  shareCount: true,
  bankName: true,
  bankNo: true,
  bankHolder: true,
  paidBy: true,
  paidAt: true,
} as const;

@Injectable()
export class RevenuePayoutRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly banks: RegionalDirectorBankRepository,
  ) {}

  async lock(tx: DbTx, directorId: string, month: string) {
    // Same order as capture/configuration. No anchor locks after share locks.
    await tx.$queryRaw`SELECT region FROM regional_directors ORDER BY region FOR SHARE`;
    // Serializes same director/month even when a replay finds zero remaining shares.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`revenue-payout:${directorId}:${month}`}, 0))::text`;
  }

  receipt(tx: DbTx, requestKey: string) {
    return tx.revenuePayout.findUnique({ where: { requestKey }, select: receiptSelect });
  }

  byId(id: string) {
    return this.prisma.db.revenuePayout.findUnique({ where: { id }, select: receiptSelect });
  }

  currentBank(tx: DbTx, directorId: string) {
    return tx.regionalDirector.findUnique({
      where: { userId: directorId },
      select: { bankName: true, bankNo: true, bankHolder: true },
    });
  }

  retainedBank(tx: DbTx, directorId: string) {
    return this.banks.forDirector(tx, directorId);
  }

  async knownDirector(tx: DbTx, directorId: string) {
    if (await this.currentBank(tx, directorId)) return true;
    if (await this.retainedBank(tx, directorId)) return true;
    return Boolean(
      await tx.revenuePayout.findFirst({ where: { directorId }, select: { id: true } }),
    );
  }

  lockShares(tx: DbTx, directorId: string, month: string) {
    return tx.$queryRaw<PayableShare[]>(revenuePayoutLockQuery(directorId, month));
  }

  create(tx: DbTx, data: Prisma.RevenuePayoutCreateInput) {
    return tx.revenuePayout.create({ data, select: receiptSelect });
  }

  settle(tx: DbTx, ids: string[], payoutId: string) {
    return tx.$executeRaw`UPDATE revenue_shares SET status = 'paid', payout_id = ${payoutId}, updated_at = now()
      WHERE id = ANY(${ids}::text[]) AND status = 'recorded' AND payout_id IS NULL`;
  }

  history(q: RevenuePayoutHistoryQuery) {
    return this.prisma.db.$queryRaw<PayoutRow[]>(revenuePayoutHistoryQuery(q));
  }
}
