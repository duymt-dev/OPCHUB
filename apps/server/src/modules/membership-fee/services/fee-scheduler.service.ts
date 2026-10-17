import { Injectable } from '@nestjs/common';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EXPIRING_DAYS } from '../domain/membership-fee.state';
import { MembershipFeeRepository } from '../repositories/membership-fee.repository';

/**
 * Job hằng ngày 00:05 Asia/Ho_Chi_Minh: active → expiring → expired. Mỗi đổi trạng thái
 * ghi outbox `membership_fee.changed` trong CÙNG transaction (cập nhật Redis + đẩy realtime).
 */
@Injectable()
export class FeeSchedulerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fees: MembershipFeeRepository,
    private readonly outbox: OutboxService,
  ) {}

  async sweep(now = new Date()): Promise<number> {
    const expiringAt = new Date(now.getTime() + EXPIRING_DAYS * 86_400_000);
    return this.prisma.db.$transaction(async (tx) => {
      const changed = await this.fees.sweepStatuses(tx, now, expiringAt);
      await this.outbox.addMany(
        tx,
        'membership_fee.changed',
        changed.map((c) => ({
          userId: c.userId,
          status: c.status,
          validUntil: c.validUntil?.toISOString() ?? null,
        })),
      );
      return changed.length;
    });
  }
}
