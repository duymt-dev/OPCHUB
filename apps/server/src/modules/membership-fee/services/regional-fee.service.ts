import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import type { MembershipFeeStatus } from '@opchub/shared';
import { conflict, notFound } from '@/common/errors';
import { OutboxService } from '@/common/outbox';
import { canTransition, statusAfterRevoke } from '../domain/membership-fee.state';
import { MembershipFeeRepository } from '../repositories/membership-fee.repository';

export interface PreviousRegionalFee {
  prevStatus: MembershipFeeStatus | null;
  prevValidUntil: Date | null;
}

/** Slot, fee, audit and outbox share the caller's transaction. */
@Injectable()
export class RegionalFeeService {
  constructor(
    private readonly fees: MembershipFeeRepository,
    private readonly outbox: OutboxService,
  ) {}

  async enter(tx: DbTx, userId: string, now: Date): Promise<PreviousRegionalFee> {
    const [cur] = await this.fees.lockForUpdate(tx, userId);
    if (!cur) throw notFound('Không tìm thấy phí thành viên');
    if (!canTransition(cur.status, 'regional_director')) throw conflict('Thành viên đã là GĐ Vùng');
    await this.change(tx, userId, cur.version, 'regional_director', null, now);
    return { prevStatus: cur.status, prevValidUntil: cur.valid_until };
  }

  async leave(tx: DbTx, userId: string, prev: PreviousRegionalFee, now: Date) {
    const [cur] = await this.fees.lockForUpdate(tx, userId);
    if (!cur) throw notFound('Không tìm thấy phí thành viên');
    const status = statusAfterRevoke(prev.prevStatus, prev.prevValidUntil, now);
    if (cur.status !== 'regional_director' || !canTransition(cur.status, status, 'revoke')) {
      throw conflict('Phí vừa được cập nhật bởi thao tác khác');
    }
    const validUntil = status === 'pending_payment' ? null : prev.prevValidUntil;
    await this.change(tx, userId, cur.version, status, validUntil, now);
    return { status, validUntil };
  }

  private async change(
    tx: DbTx,
    userId: string,
    version: number,
    status: MembershipFeeStatus,
    validUntil: Date | null,
    now: Date,
  ) {
    if (!(await this.fees.changeRegional(tx, userId, version, status, validUntil, now))) {
      throw conflict('Phí vừa được cập nhật bởi thao tác khác');
    }
    await this.outbox.add(tx, 'membership_fee.changed', {
      userId,
      status,
      validUntil: validUntil?.toISOString() ?? null,
    });
  }
}
