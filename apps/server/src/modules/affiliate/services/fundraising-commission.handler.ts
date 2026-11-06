import { commissionRateFor, customerYearOf } from '@opchub/shared';
import { CustomerYearRepository } from '../../reporting';
import { Injectable } from '@nestjs/common';
import type { OutboxPayload } from '@opchub/shared/outbox';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { commissionAmount } from '../domain/commission-amount';
import { monthKey } from '../domain/month-key';
import { CommissionRepository } from '../repositories/commission.repository';
import { PolicyRepository } from '../repositories/policy.repository';

/**
 * D-70 (AD-06, V4-610): Admin duyệt Gói Gọi vốn → hoa hồng % Gọi vốn (chính sách, mặc định 10) ×
 * số tiền gói cho đại lý giới thiệu chủ dự án. Không có người giới thiệu / khoản
 * legacy (0đ) → không ghi. Idempotent theo `fundraising_id`; không đổi trạng thái referral.
 */
@Injectable()
export class FundraisingCommissionHandler {
  constructor(
    private readonly years: CustomerYearRepository,
    private readonly prisma: PrismaService,
    private readonly commissions: CommissionRepository,
    private readonly policy: PolicyRepository,
    private readonly outbox: OutboxService,
  ) {}

  async onReviewed(p: OutboxPayload<'fundraising.reviewed'>): Promise<void> {
    if (p.decision !== 'approve' || p.amount <= 0) return;
    await this.prisma.db.$transaction(async (tx) => {
      const at = new Date(p.reviewedAt);
      const anchor = await this.years.firstPaid(tx, p.ownerId, at, 'fundraising', p.fundraisingId);
      const ref = await this.commissions.referrerOf(tx, p.ownerId);
      // D-110: mã luôn hoạt động — không bỏ qua theo trạng thái phí của đại lý
      if (!ref || ref.affiliateUserId === p.ownerId) return;
      const policy = await this.policy.get(tx);
      const customerYear = customerYearOf(anchor.firstPaidAt, at);
      const rate = commissionRateFor(customerYear, {
        ...policy,
        firstYearRate: policy.fundraisingRate,
      });
      if (rate === null) return;
      const amount = commissionAmount(p.amount, rate);
      if (amount <= 0) return;
      const id = await this.commissions.recordFundraising(tx, {
        affiliateId: ref.affiliateId,
        referredUserId: p.ownerId,
        fundraisingId: p.fundraisingId,
        listAmount: p.amount,
        amount,
        rate,
        customerYear,
        monthKey: monthKey(new Date(p.reviewedAt)),
      });
      if (id) await this.outbox.add(tx, 'affiliate.commission_recorded', { commissionId: id });
    });
  }
}
