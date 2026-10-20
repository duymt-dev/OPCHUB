import { Injectable } from '@nestjs/common';
import type { OutboxPayload } from '@opchub/shared/outbox';
import { affiliateBankSchema } from '@opchub/shared/api-domains';
import { NotificationService } from '../../notification';
import { AffiliateNoticeRepository } from '../repositories/affiliate-notice.repository';

@Injectable()
export class AffiliateAdminNotifyHandler {
  constructor(
    private readonly repo: AffiliateNoticeRepository,
    private readonly notify: NotificationService,
  ) {}

  async cancelled(p: OutboxPayload<'affiliate.commission_cancelled'>): Promise<void> {
    const rows = await this.repo.cancelled(p.commissionIds);
    await this.notify.notify(
      rows.map((r) => ({
        id: `affiliate:cancel:${p.notificationId}:${r.id}`,
        userId: r.userId,
        type: 'affiliate' as const,
        title: 'Hoa hồng đã bị hủy',
        body: `Lý do: ${p.reason}`,
        link: '/affiliate',
      })),
    );
  }

  async rateChanged(p: OutboxPayload<'affiliate.rate_changed'>): Promise<void> {
    const rows = await this.repo.rates(p.affiliateIds);
    await this.notify.notify(
      rows.map((r) => ({
        id: `affiliate:rate:${p.notificationId}:${r.id}`,
        userId: r.userId,
        type: 'affiliate' as const,
        title: `Tỷ lệ hoa hồng của bạn đổi thành ${p.rate}%`,
        body: 'Áp dụng cho các khoản hoa hồng chưa chi trả và khách mới từ hôm nay.',
        link: '/affiliate',
      })),
    );
  }

  async payout(p: OutboxPayload<'affiliate.payout_recorded'>): Promise<void> {
    const r = await this.repo.payout(p.affiliateId, p.monthKey, p.payoutId);
    if (!r) return;
    const bank = affiliateBankSchema.parse(r.bank);
    const amount = Number(r.amount).toLocaleString('vi-VN');
    await this.notify.notify([
      {
        id: `affiliate:payout:${p.payoutId}`,
        userId: r.userId,
        type: 'affiliate',
        title: `Đã chi trả hoa hồng ${p.monthKey}: ${amount}đ`,
        body: `Chuyển khoản tới ${bank.bankHolder} · ${bank.bankName} ${bank.bankNo} (${r.count} khách hàng).`,
        link: '/affiliate',
      },
    ]);
  }
}
