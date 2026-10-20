import { Inject, Injectable, Logger } from '@nestjs/common';
import type { AffiliateStatus, DbTx } from '@opchub/db';
import type { OutboxPayload } from '@opchub/shared/outbox';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { FEE_READER, type FeeReader, MemberDirectory } from '../../account';
import { commissionAmount } from '../domain/commission-amount';
import { monthKey } from '../domain/month-key';
import { AffiliateRepository } from '../repositories/affiliate.repository';
import { CommissionRepository } from '../repositories/commission.repository';
import { AffiliateAllocationService } from './affiliate-allocation.service';

/**
 * Consumer outbox phí → đại lý (§20, idempotent):
 * - `membership_fee.confirmed`: AF-R01 tạo đại lý; AF-R05/R06 hoa hồng lần đóng phí đầu.
 * - `membership_fee.changed|activated`: AF-R07 tạm dừng khi hết hạn, hoạt động lại khi gia hạn.
 */
@Injectable()
export class AffiliateLifecycleHandler {
  private readonly logger = new Logger(AffiliateLifecycleHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly affiliates: AffiliateRepository,
    private readonly commissions: CommissionRepository,
    private readonly outbox: OutboxService,
    private readonly members: MemberDirectory,
    private readonly allocation: AffiliateAllocationService,
    @Inject(FEE_READER) private readonly fees: FeeReader,
  ) {}

  async onFeeConfirmed(p: OutboxPayload<'membership_fee.confirmed'>): Promise<void> {
    const at = new Date(p.confirmedAt);
    await this.prisma.db.$transaction(async (tx) => {
      await this.ensureAffiliate(tx, p.userId);
      await this.recordCommission(tx, p, at);
    });
  }

  async onFeeChanged(p: OutboxPayload<'membership_fee.changed'>): Promise<void> {
    // Payload có thể cũ khi relay retry sau một lần gia hạn/hết hạn mới hơn.
    const desired = await this.currentStatus(p.userId);
    await this.prisma.db.$transaction(async (tx) => {
      if (desired === 'paused') await this.affiliates.transition(tx, p.userId, 'active', 'paused');
      else await this.affiliates.transition(tx, p.userId, 'paused', 'active');
    });
  }

  /** AF-R01: TV đã đóng phí → đại lý active, % = chính sách hiện hành */
  async ensureAffiliate(tx: DbTx, userId: string): Promise<void> {
    const status = await this.currentStatus(userId);
    const cur = await this.affiliates.byUser(tx, userId);
    if (cur) {
      if (cur.status !== status) await this.affiliates.transition(tx, userId, cur.status, status);
      return;
    }
    const user = await this.members.byId(userId);
    if (!user || user.accountType === 'investor') return;
    await this.allocation.ensure(tx, [{ userId, fullName: user.fullName, status }]);
  }

  private async currentStatus(userId: string): Promise<AffiliateStatus> {
    const fee = await this.fees.feeOf(userId);
    return fee?.validUntil &&
      fee.validUntil.getTime() >= Date.now() &&
      (fee.status === 'active' || fee.status === 'expiring')
      ? 'active'
      : 'paused';
  }

  /** AF-R05/R06: chỉ lần đóng phí đầu; đại lý tạm dừng (hoặc phí đã hết hạn — D-57) → void */
  private async recordCommission(
    tx: DbTx,
    p: OutboxPayload<'membership_fee.confirmed'>,
    at: Date,
  ): Promise<void> {
    const ref = await this.commissions.pendingReferral(tx, p.userId);
    if (!ref) return;
    if (!p.isFirst) return;
    if (await this.isPaused(ref.affiliateStatus, ref.affiliateUserId, at)) {
      await this.commissions.closeReferral(tx, ref.id, 'void', at);
      this.logger.log({ referralId: ref.id }, 'Đại lý tạm dừng — referral void, không hoa hồng');
      return;
    }
    if (!(await this.commissions.closeReferral(tx, ref.id, 'converted', at))) return;
    const id = await this.commissions.record(tx, {
      affiliateId: ref.affiliateId,
      referredUserId: p.userId,
      feePeriodId: p.periodId,
      listAmount: p.listAmount,
      amount: commissionAmount(p.listAmount, ref.rate),
      rate: ref.rate,
      monthKey: monthKey(at),
    });
    if (id) await this.outbox.add(tx, 'affiliate.commission_recorded', { commissionId: id });
  }

  private async isPaused(status: string, affiliateUserId: string, at: Date): Promise<boolean> {
    if (status === 'paused') return true;
    const fee = await this.fees.feeOf(affiliateUserId);
    return !fee?.validUntil || fee.validUntil.getTime() < at.getTime();
  }
}
