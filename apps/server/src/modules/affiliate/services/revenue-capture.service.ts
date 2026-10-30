import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { affiliateBankSchema } from '@opchub/shared/api-domains';
import type { OutboxPayload, RevenueReceipt } from '@opchub/shared/outbox';
import { OutboxService } from '@/common/outbox';
import { AuditService } from '@/common/audit';
import { MemberDirectory } from '../../account';
import { ProvinceDirectoryService } from '../../community';
import { RevenueReceiptRegistry, type RevenueReceiptPort } from '../../membership-fee';
import { RevenueSharingRepository } from '../repositories/revenue-sharing.repository';

@Injectable()
export class RevenueCaptureService implements RevenueReceiptPort, OnModuleInit {
  constructor(
    private readonly registry: RevenueReceiptRegistry,
    private readonly repo: RevenueSharingRepository,
    private readonly community: ProvinceDirectoryService,
    private readonly members: MemberDirectory,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  prepare(tx: DbTx): Promise<void> {
    return this.repo.lockConfiguration(tx);
  }

  async capture(tx: DbTx, receipt: RevenueReceipt): Promise<void> {
    const { first, changed } = await this.repo.firstReceipt(
      tx,
      receipt.customerId,
      new Date(receipt.receivedAt),
    );
    const corrected = changed ? await this.repo.reanchorUnpaid(tx, receipt.customerId, first) : 0;
    const paid = changed ? await this.repo.paidBeforeCorrection(tx, receipt.customerId, first) : 0;
    if (corrected || paid)
      await this.audit.log(tx, {
        actorId: null,
        action: 'affiliate.revenue_anchor_corrected',
        entity: 'revenue_customer',
        entityId: receipt.customerId,
        tag: 'affiliate',
        summary: 'Cập nhật mốc thực thu đầu; khoản đã chi được giữ nguyên để đối soát',
        diff: {
          firstReceivedAt: first.toISOString(),
          correctedUnpaid: corrected,
          paidReviewRequired: paid,
        },
      });
    const policy = await this.repo.policy(tx);
    const ref = await this.repo.referrer(tx, receipt.customerId);
    const eligible = ref && ref.status !== 'void' && ref.affiliate.userId !== receipt.customerId;
    const [province] = eligible ? await this.community.provincesOf([ref.affiliate.userId], tx) : [];
    const slot = province ? await this.repo.slotForProvince(tx, province.province) : null;
    const incumbent = slot?.director;
    let director: OutboxPayload<'affiliate.revenue_received'>['director'] = null;
    // D-121: neither a new appointment nor a delayed relay can earn pre-appointment receipts.
    if (
      incumbent?.userId &&
      incumbent.appointedAt &&
      incumbent.appointedAt <= new Date(receipt.receivedAt) &&
      incumbent.appointedAt <= new Date(receipt.recordedAt)
    ) {
      const person = await this.members.byId(incumbent.userId, tx);
      if (person) {
        const bank =
          incumbent.bankName && incumbent.bankNo && incumbent.bankHolder
            ? affiliateBankSchema.parse(incumbent)
            : null;
        director = { id: person.id, name: person.fullName, bank };
      }
    }
    await this.outbox.add(tx, 'affiliate.revenue_received', {
      receipt,
      firstReceivedAt: first.toISOString(),
      policy,
      affiliateId: eligible ? ref.affiliateId : null,
      region: slot?.region ?? null,
      director,
    });
  }
}
