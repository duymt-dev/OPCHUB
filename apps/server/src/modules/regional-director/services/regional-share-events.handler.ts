import { Injectable } from '@nestjs/common';
import type { OutboxPayload } from '@opchub/shared/outbox';
import { REGIONAL_LABELS } from '@opchub/shared/api-domains';
import { NotificationService } from '@/modules/notification';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RegionalShareLedgerService } from './regional-share-ledger.service';

@Injectable()
export class RegionalShareEventsHandler {
  constructor(
    private readonly ledger: RegionalShareLedgerService,
    private readonly prisma: PrismaService,
    private readonly notify: NotificationService,
  ) {}
  async membership(p: OutboxPayload<'membership_fee.confirmed'>) {
    await this.ledger.record({
      source: 'membership',
      sourceId: p.periodId,
      customerId: p.userId,
      baseAmount: p.listAmount,
      plan: p.plan,
      at: new Date(p.confirmedAt),
    });
  }
  async fundraising(p: OutboxPayload<'fundraising.reviewed'>) {
    if (p.decision !== 'approve') return;
    await this.ledger.record({
      source: 'fundraising',
      sourceId: p.fundraisingId,
      customerId: p.ownerId,
      baseAmount: p.amount,
      plan: 'fundraising',
      at: new Date(p.reviewedAt),
    });
  }
  async payout(p: OutboxPayload<'regional_share.payout_recorded'>) {
    const receipt = await this.prisma.db.regionalPayout.findUnique({
      where: { id: p.payoutId },
      select: { amount: true, monthKeys: true },
    });
    if (!receipt) return;
    await this.notify.notify([
      {
        id: `regional-payout:${p.payoutId}`,
        userId: p.directorUserId,
        type: 'affiliate',
        title: 'Chi trả phần GĐ Vùng',
        body: `Media Soft đã chi trả ${receipt.amount.toLocaleString('vi-VN')}đ phần GĐ Vùng ${REGIONAL_LABELS[p.region]} · ${receipt.monthKeys.join(', ')}`,
        link: '/affiliate',
      },
    ]);
  }
}
