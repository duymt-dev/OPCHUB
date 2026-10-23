import { Inject, Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { type MembershipPlan, planAmount, planOf } from '@opchub/shared';
import type { MyMembership, TransferConfirmResponse } from '@opchub/shared/api-domains';
import { effectiveFeeStatus } from '@/common/auth';
import { ENV, type Env } from '@/common/config';
import { AppError, conflict, forbidden, notFound } from '@/common/errors';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ConsentWriter, MemberDirectory } from '../../account';
import { localPhone, nextPeriod } from '../domain/fee-period';
import { canTransition, statusByValidUntil } from '../domain/membership-fee.state';
import { MembershipFeeRepository } from '../repositories/membership-fee.repository';
import { PaymentTransactionRepository } from '../repositories/payment-transaction.repository';

export interface ActivateInput {
  userId: string;
  amount: number;
  source: 'transfer' | 'manual';
  paymentTransactionId?: string;
  collectedBy?: string;
  reason?: string;
}

/** Phí thành viên: hộp chuyển khoản, ghi nhận CK, kích hoạt kỳ phí (BR-03 → BR-05, D-31) */
@Injectable()
export class MembershipFeeService {
  constructor(
    private readonly fees: MembershipFeeRepository,
    private readonly txns: PaymentTransactionRepository,
    private readonly members: MemberDirectory,
    private readonly outbox: OutboxService,
    private readonly prisma: PrismaService,
    private readonly consents: ConsentWriter,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async mine(userId: string, now = new Date()): Promise<MyMembership> {
    const [fee, m] = await Promise.all([this.fees.findCurrent(userId), this.members.byId(userId)]);
    if (!fee || !m) throw notFound('Không tìm thấy phí thành viên');
    return {
      // D-57 / BUG-018: trạng thái hiệu lực tại `now` (không ghi DB — job đổi trạng thái)
      status: effectiveFeeStatus(fee, now),
      validUntil: fee.validUntil?.toISOString() ?? null,
      transferRef: `OPCHUB ${m.memberCode}`,
      amount: fee.amount,
      memberCode: m.memberCode,
      bank: {
        bankName: this.env.BANK_NAME,
        accountNo: this.env.BANK_ACCOUNT_NO,
        accountName: this.env.BANK_ACCOUNT_NAME,
        bankFullName: this.env.BANK_FULL_NAME,
      },
      // BR-04: OPCHUB [Mã TV] [SĐT]; đối soát chỉ theo Mã TV (D-41)
      transferContent: `OPCHUB ${m.memberCode} ${localPhone(m.phone)}`.trim(),
    };
  }

  /** D-31: chỉ ghi nhận; kích hoạt khi webhook ngân hàng về */
  /** NR-R02: bấm "Tôi đã chuyển khoản" = đồng ý điều kiện thanh toán → lưu vết `fee_policy` */
  async confirmTransfer(userId: string): Promise<TransferConfirmResponse> {
    const fee = await this.fees.findCurrent(userId);
    if (!fee) throw notFound('Không tìm thấy phí thành viên');
    await this.prisma.db.$transaction((tx) => this.consents.feePolicy(tx, userId));
    return { status: fee.status, awaitingWebhook: true };
  }

  /**
   * Kích hoạt / gia hạn trong transaction của caller: khoá dòng phí, tính kỳ nối tiếp,
   * cập nhật có điều kiện theo version, ghi kỳ + outbox `membership_fee.activated` (rule 8, 9).
   */
  async activate(tx: DbTx, input: ActivateInput, now: Date): Promise<Date> {
    const [cur] = await this.fees.lockForUpdate(tx, input.userId);
    if (!cur) throw notFound('Không tìm thấy phí thành viên');
    if (!canTransition(cur.status, 'active')) {
      throw conflict('Trạng thái phí không cho phép kích hoạt');
    }
    // QĐ-01 / NA-03 (TIP-V2-108 BR-6): khớp tay thiếu tiền được — kế toán chịu trách nhiệm, có lý do + audit
    if (input.source !== 'manual' && input.amount < cur.amount) {
      throw new AppError('VALIDATION_ERROR', 'Số tiền nhỏ hơn phí thành viên');
    }
    const period = nextPeriod(cur.valid_until, now);
    const status = statusByValidUntil(period.endsAt, now);
    const next = await this.nextPlan(input.userId);
    const ok = await this.fees.activate(
      tx,
      input.userId,
      cur.version,
      period.endsAt,
      status,
      now,
      next,
    );
    if (!ok) throw conflict('Phí vừa được cập nhật bởi thao tác khác');
    const added = await this.txns.addPeriod(tx, {
      userId: input.userId,
      startsAt: period.startsAt,
      endsAt: period.endsAt,
      amount: input.amount,
      source: input.source,
      paymentTransactionId: input.paymentTransactionId ?? null,
      collectedBy: input.collectedBy ?? null,
      reason: input.reason ?? null,
    });
    await this.outbox.add(tx, 'membership_fee.activated', {
      userId: input.userId,
      status,
      validUntil: period.endsAt.toISOString(),
    });
    // §20 AF-R01/R05: một điểm cho mọi đường xác nhận phí; phí niêm yết (không phải số tiền chuyển)
    await this.outbox.add(tx, 'membership_fee.confirmed', {
      userId: input.userId,
      periodId: added.id,
      listAmount: cur.amount,
      confirmedAt: now.toISOString(),
      isFirst: added.isFirst,
    });
    return period.endsAt;
  }

  /** D-68: gói kỳ sau theo loại TK hiện tại (Admin đổi loại TK áp từ kỳ gia hạn sau) */
  private async nextPlan(userId: string): Promise<{ plan: MembershipPlan; amount: number }> {
    const m = await this.members.byId(userId);
    const plan = (m && planOf(m.accountType)) ?? 'personal';
    return { plan, amount: planAmount(plan) };
  }

  /** D-14: Nhà đầu tư không đóng phí */
  async assertPayer(userId: string): Promise<void> {
    const m = await this.members.byId(userId);
    if (!m) throw notFound('Không tìm thấy thành viên');
    if (m.accountType === 'investor') throw forbidden('Nhà đầu tư không cần đóng phí');
  }
}
