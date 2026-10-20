import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { affiliatePayoutResultSchema } from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { conflict, notFound } from '@/common/errors';
import { IdempotencyService } from '@/common/idempotency/idempotency.service';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MemberDirectory } from '../../account';
import { monthKey } from '../domain/month-key';
import { AffiliateWriteRepository } from '../repositories/affiliate-write.repository';
import type { AffiliateActor } from '../types';
import { affiliateBankOf } from './me-affiliate.service';

@Injectable()
export class PayoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: AffiliateWriteRepository,
    private readonly members: MemberDirectory,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly idem: IdempotencyService,
  ) {}

  async record(
    actor: AffiliateActor,
    affiliateId: string,
    month: string,
    key: string | undefined,
    now = new Date(),
  ) {
    const scope = `affiliate-payout:${affiliateId}:${month}`;
    return this.idem.run(scope, actor.id, key, affiliatePayoutResultSchema, async () => {
      const payoutId = createHash('sha256')
        .update(`${scope}:${actor.id}:${key ?? ''}`)
        .digest('hex');
      return this.prisma.db.$transaction(async (tx) => {
        const [affiliate] = await this.repo.lock(tx, [affiliateId]);
        if (!affiliate) throw notFound('Không tìm thấy đại lý');
        // Biên lai trong DB phục hồi kết quả nếu commit đã xong nhưng Redis mất kết nối.
        const prior = await this.repo.receipt(tx, affiliateId, month, payoutId);
        if (prior.paid) return prior;
        if (month >= monthKey(now)) throw conflict('Chỉ chi trả tháng đã kết thúc');
        const bank = affiliateBankOf(affiliate);
        if (!bank) {
          const owner = await this.members.byId(affiliate.userId, tx);
          throw conflict(`${owner?.fullName ?? 'Đại lý'} chưa cập nhật số tài khoản`);
        }
        const result = await this.repo.paid(tx, affiliateId, month, bank, actor.id, payoutId, now);
        if (!result.paid) throw conflict(`Không còn hoa hồng chưa chi trong ${month}`);
        await this.audit.log(tx, {
          actorId: actor.id,
          ip: actor.ip,
          action: 'affiliate.payout',
          entity: 'affiliate',
          entityId: affiliateId,
          tag: 'affiliate',
          summary: `Chi trả ${result.amount.toLocaleString('vi-VN')}đ · kỳ ${month}`,
          diff: { monthKey: month, amount: result.amount, count: result.paid, bank, payoutId },
        });
        await this.outbox.add(tx, 'affiliate.payout_recorded', {
          affiliateId,
          monthKey: month,
          payoutId,
        });
        return result;
      });
    });
  }
}
