import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import {
  type MembershipFeeStatus,
  type MembershipPlan,
  expirableFeeStatuses,
} from '@opchub/shared';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { FeeSnapshot } from '../../account';

export interface FeeChange {
  userId: string;
  status: MembershipFeeStatus;
  validUntil: Date | null;
}

/** Bảng membership_fees — chỉ domain membership-fee đọc/ghi */
@Injectable()
export class MembershipFeeRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCurrent(userId: string): Promise<(FeeSnapshot & { paidAt: Date | null }) | null> {
    return this.prisma.db.membershipFee.findUnique({
      where: { userId },
      select: { status: true, validUntil: true, amount: true, paidAt: true },
    });
  }

  /** Hồ sơ › Gói & thanh toán: kỳ phí của tôi, mới nhất trước — index `(user_id, ends_at DESC)` */
  listPeriods(userId: string, take: number) {
    return this.prisma.db.membershipFeePeriod.findMany({
      where: { userId },
      orderBy: { endsAt: 'desc' },
      take,
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        amount: true,
        source: true,
        createdAt: true,
      },
    });
  }

  /** Khoá dòng phí trong transaction kích hoạt (hai giao dịch cùng user → tuần tự) */
  lockForUpdate(tx: DbTx, userId: string) {
    return tx.$queryRaw<
      {
        status: MembershipFeeStatus;
        valid_until: Date | null;
        amount: number;
        version: number;
        plan: MembershipPlan;
      }[]
    >`SELECT status, valid_until, amount, version, plan::text AS plan FROM membership_fees
      WHERE user_id = ${userId} FOR UPDATE`;
  }

  /**
   * Cập nhật có điều kiện theo `version` đã khoá (rule 8: 0 dòng → xung đột).
   * D-68/D-69: `next` = gói + số tiền cho lần gia hạn kế tiếp (theo loại TK hiện tại).
   */
  async activate(
    tx: DbTx,
    userId: string,
    fromVersion: number,
    validUntil: Date,
    status: MembershipFeeStatus,
    paidAt: Date,
    next: { plan: MembershipPlan; amount: number },
  ): Promise<boolean> {
    const r = await tx.membershipFee.updateMany({
      where: { userId, version: fromVersion },
      data: { status, validUntil, paidAt, ...next, version: { increment: 1 } },
    });
    return r.count === 1;
  }

  /**
   * Scheduler hằng ngày: active → expiring (còn ≤ 30 ngày), trial|active|expiring → expired.
   * Dùng partial index `membership_fees_due (valid_until) WHERE status IN (trial, active, expiring)`.
   * Điều kiện trạng thái nguồn trong WHERE → chạy lại không đổi thêm (idempotent).
   */
  async sweepStatuses(tx: DbTx, now: Date, expiringAt: Date): Promise<FeeChange[]> {
    const expired = await tx.$queryRaw<FeeChange[]>`
      UPDATE membership_fees SET status = 'expired', version = version + 1, updated_at = now()
      WHERE status = ANY(${expirableFeeStatuses()}::membership_fee_status[]) AND valid_until <= ${now}
      RETURNING user_id AS "userId", status, valid_until AS "validUntil"`;
    const expiring = await tx.$queryRaw<FeeChange[]>`
      UPDATE membership_fees SET status = 'expiring', version = version + 1, updated_at = now()
      WHERE status = 'active' AND valid_until > ${now} AND valid_until <= ${expiringAt}
      RETURNING user_id AS "userId", status, valid_until AS "validUntil"`;
    return [...expired, ...expiring];
  }
}
