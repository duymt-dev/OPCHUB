import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { conflict, notFound } from '@/common/errors';
import { OutboxService } from '@/common/outbox';
import { canTransition } from '../domain/membership-fee.state';
import { feeStatusAfterRevocation } from '../domain/regional-director-fee';
import { RegionalDirectorFeeRepository } from '../repositories/regional-director-fee.repository';

/** D-120: called inside affiliate's appointment transaction; no cross-domain table writes. */
@Injectable()
export class RegionalDirectorFeeService {
  constructor(
    private readonly repo: RegionalDirectorFeeRepository,
    private readonly outbox: OutboxService,
  ) {}

  async appoint(tx: DbTx, userId: string) {
    const fee = await this.repo.lock(tx, userId);
    if (!fee) throw notFound('Không tìm thấy phí thành viên');
    if (!canTransition(fee.status, 'regional_director'))
      throw conflict('Thành viên đã được miễn phí GĐ Vùng');
    if (!(await this.repo.appoint(tx, userId, fee))) throw conflict('Phí vừa được cập nhật');
    await this.outbox.add(tx, 'membership_fee.changed', {
      userId,
      status: 'regional_director',
      validUntil: fee.validUntil?.toISOString() ?? null,
    });
  }

  async revoke(tx: DbTx, userId: string, now: Date) {
    const fee = await this.repo.lock(tx, userId);
    if (!fee || fee.status !== 'regional_director' || !fee.previousStatus) {
      throw conflict('Thành viên không có miễn phí GĐ Vùng để thu hồi');
    }
    const status = feeStatusAfterRevocation(
      { status: fee.previousStatus, validUntil: fee.previousValidUntil },
      now,
    );
    if (!canTransition(fee.status, status)) throw conflict('Không thể khôi phục trạng thái phí');
    if (!(await this.repo.revoke(tx, userId, fee, status))) throw conflict('Phí vừa được cập nhật');
    await this.outbox.add(tx, 'membership_fee.changed', {
      userId,
      status,
      validUntil: fee.previousValidUntil?.toISOString() ?? null,
    });
    return { status, validUntil: fee.previousValidUntil };
  }
}
