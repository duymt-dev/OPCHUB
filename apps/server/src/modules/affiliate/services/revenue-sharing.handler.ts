import { Injectable } from '@nestjs/common';
import { parseOutboxPayload, type OutboxPayload } from '@opchub/shared/outbox';
import { RevenueSharingRepository } from '../repositories/revenue-sharing.repository';
import { allocateRevenue } from '../domain/revenue-sharing';
import { monthKey } from '../domain/month-key';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class RevenueSharingHandler {
  constructor(
    private readonly repo: RevenueSharingRepository,
    private readonly prisma: PrismaService,
  ) {}

  async received(payload: OutboxPayload<'affiliate.revenue_received'>): Promise<void> {
    const snapshot = parseOutboxPayload('affiliate.revenue_received', payload);
    const { receipt, policy, director } = snapshot;
    const receivedAt = new Date(receipt.receivedAt);
    await this.prisma.db.$transaction(async (tx) => {
      // Serialize against later receipt capture/reanchoring, but never re-resolve director or policy.
      const firstReceivedAt =
        (await this.repo.lockAnchor(tx, receipt.customerId)) ?? new Date(snapshot.firstReceivedAt);
      const allocation = allocateRevenue({
        amount: receipt.amount,
        receivedAt,
        firstReceivedAt,
        policy,
        hasDirector: director !== null,
      });
      await this.repo.insert(tx, {
        source: receipt.source,
        sourceId: receipt.sourceId,
        plan: receipt.plan,
        customerId: receipt.customerId,
        affiliateId: snapshot.affiliateId,
        region: snapshot.region,
        directorId: director?.id ?? null,
        directorName: director?.name ?? null,
        bankName: director?.bank?.bankName ?? null,
        bankNo: director?.bank?.bankNo ?? null,
        bankHolder: director?.bank?.bankHolder ?? null,
        receivedAt,
        firstReceivedAt,
        recordedAt: new Date(receipt.recordedAt),
        amount: receipt.amount,
        ...policy,
        ...allocation,
        monthKey: monthKey(new Date(receipt.recordedAt)),
      });
    });
  }
}
