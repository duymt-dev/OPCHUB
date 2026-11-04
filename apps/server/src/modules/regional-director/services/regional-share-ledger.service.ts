import { CustomerYearRepository } from '../../reporting';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { OutboxService } from '@/common/outbox';
import { AffiliateShareReader } from '@/modules/affiliate';
import { RegionalProjectionRepository } from '@/modules/reporting';
import { regionalShareSnapshot, type ShareSource } from '../domain/regional-share.rules';
import { RegionalShareRepository } from '../repositories/regional-share.repository';

@Injectable()
export class RegionalShareLedgerService {
  constructor(
    private readonly customerYears: CustomerYearRepository,
    private readonly prisma: PrismaService,
    private readonly repo: RegionalShareRepository,
    private readonly affiliate: AffiliateShareReader,
    private readonly projection: RegionalProjectionRepository,
    private readonly outbox: OutboxService,
  ) {}

  async record(input: ShareSource) {
    if (input.baseAmount <= 0) return null;
    return this.prisma.db.$transaction(async (tx) => {
      const first = await this.customerYears.firstPaid(
        tx,
        input.customerId,
        input.at,
        input.source,
        input.sourceId,
      );
      const ref = await this.affiliate.referrerOf(tx, input.customerId);
      if (!ref || ref.affiliateUserId === input.customerId) return null;
      const region = await this.projection.affiliateRegionAt(tx, ref.affiliateUserId);
      const directorUserId = region ? await this.repo.directorAt(tx, region, input.at) : null;
      const snapshot = regionalShareSnapshot(
        input,
        first.firstPaidAt,
        await this.affiliate.policyAt(tx),
        Boolean(directorUserId),
      );
      const id = await this.repo.record(tx, {
        source: input.source,
        sourceId: input.sourceId,
        customerId: input.customerId,
        ...ref,
        region: directorUserId ? region : null,
        directorUserId,
        plan: input.plan,
        baseAmount: input.baseAmount,
        recordedAt: input.at,
        ...snapshot,
      });
      if (id) await this.outbox.add(tx, 'regional_share.recorded', { shareId: id });
      return id;
    });
  }
}
