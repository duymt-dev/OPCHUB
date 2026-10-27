import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import type { OutboxPayload } from '@opchub/shared/outbox';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MemberDirectory } from '../../account';
import { commissionAmount } from '../domain/commission-amount';
import { monthKey } from '../domain/month-key';
import { CommissionRepository } from '../repositories/commission.repository';
import { AffiliateAllocationService } from './affiliate-allocation.service';

/**
 * Consumer outbox phí → đại lý (§20, idempotent). D-94 3A: mọi TV là đại lý từ khi đăng ký (tạo ở
 * `AffiliateEnrollService`); ở đây chỉ bảo đảm còn thiếu thì tạo. D-110: mã luôn hoạt động — không
 * tạm dừng theo phí (bỏ AF-R07). AF-R05/R06: hoa hồng lần đóng phí đầu theo gói thực trả.
 */
@Injectable()
export class AffiliateLifecycleHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commissions: CommissionRepository,
    private readonly outbox: OutboxService,
    private readonly members: MemberDirectory,
    private readonly allocation: AffiliateAllocationService,
  ) {}

  async onFeeConfirmed(p: OutboxPayload<'membership_fee.confirmed'>): Promise<void> {
    const at = new Date(p.confirmedAt);
    await this.prisma.db.$transaction(async (tx) => {
      await this.ensureAffiliate(tx, p.userId);
      await this.recordCommission(tx, p, at);
    });
  }

  /** D-94 3A: TV (không phải NĐT) chưa có đại lý → tạo, % = chính sách hiện hành */
  async ensureAffiliate(tx: DbTx, userId: string): Promise<void> {
    const user = await this.members.byId(userId, tx);
    if (!user || user.accountType === 'investor') return;
    await this.allocation.ensure(tx, [{ userId, fullName: user.fullName, status: 'active' }]);
  }

  /** AF-R05/R06 + BR-AFF-REV: chỉ lần đóng phí đầu (trial không phát sự kiện) */
  private async recordCommission(
    tx: DbTx,
    p: OutboxPayload<'membership_fee.confirmed'>,
    at: Date,
  ): Promise<void> {
    const ref = await this.commissions.pendingReferral(tx, p.userId);
    if (!ref || !p.isFirst) return;
    if (!(await this.commissions.closeReferral(tx, ref.id, 'converted', at))) return;
    const id = await this.commissions.record(tx, {
      affiliateId: ref.affiliateId,
      referredUserId: p.userId,
      feePeriodId: p.periodId,
      listAmount: p.listAmount,
      plan: p.plan,
      amount: commissionAmount(p.listAmount, ref.rate),
      rate: ref.rate,
      monthKey: monthKey(at),
    });
    if (id) await this.outbox.add(tx, 'affiliate.commission_recorded', { commissionId: id });
  }
}
