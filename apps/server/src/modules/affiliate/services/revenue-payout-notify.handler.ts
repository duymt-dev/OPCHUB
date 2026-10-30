import { Injectable } from '@nestjs/common';
import type { OutboxPayload } from '@opchub/shared/outbox';
import { MemberDirectory } from '../../account';
import { NotificationService } from '../../notification';
import { RevenuePayoutRepository } from '../repositories/revenue-payout.repository';

@Injectable()
export class RevenuePayoutNotifyHandler {
  constructor(
    private readonly repo: RevenuePayoutRepository,
    private readonly members: MemberDirectory,
    private readonly notify: NotificationService,
  ) {}

  async recorded(p: OutboxPayload<'affiliate.revenue_payout_recorded'>): Promise<void> {
    const row = await this.repo.byId(p.payoutId);
    if (!row || !(await this.members.byId(row.directorId))) return;
    await this.notify.notify([
      {
        id: `revenue:payout:${row.id}`,
        userId: row.directorId,
        type: 'affiliate',
        title: `Đã chi trả chia sẻ GĐ Vùng ${row.monthKey}: ${row.amount.toLocaleString('vi-VN')}đ`,
        body: `${row.bankHolder} · ${row.bankName} ${row.bankNo} (${row.shareCount} khoản).`,
        link: '/affiliate',
      },
    ]);
  }
}
