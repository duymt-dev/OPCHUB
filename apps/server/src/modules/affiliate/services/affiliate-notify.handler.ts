import { Injectable } from '@nestjs/common';
import type { OutboxPayload } from '@opchub/shared/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationService } from '../../notification';
import { MemberDirectory } from '../../account';
import { CommissionRepository } from '../repositories/commission.repository';

const LINK = '/affiliate';

/** Thông báo chuông cho đại lý (copy prototype ver2 §20) */
@Injectable()
export class AffiliateNotifyHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commissions: CommissionRepository,
    private readonly notify: NotificationService,
    private readonly members: MemberDirectory,
  ) {}

  /** AF-R06 */
  async recorded(p: OutboxPayload<'affiliate.commission_recorded'>): Promise<void> {
    const c = await this.commissions.forNotice(p.commissionId, this.prisma.db);
    if (!c) return;
    const customer = await this.members.byId(c.customerId);
    const vnd = (n: number) => `${new Intl.NumberFormat('vi-VN').format(n)}đ`;
    // V4-610 (prototype `_fundDecide`): hoa hồng Gói Gọi vốn khi Admin duyệt
    const fund = c.source === 'fundraising';
    await this.notify.notify([
      {
        id: `affiliate:commission:${p.commissionId}`,
        userId: c.userId,
        type: 'affiliate',
        title: fund
          ? `Hoa hồng Gói Gọi vốn: ${vnd(c.amount)}`
          : `Hoa hồng mới: ${customer?.fullName ?? 'Thành viên đã xóa'} đã đóng phí thành viên`,
        body: fund
          ? `${Math.round((c.amount * 100) / Math.max(c.listAmount, 1))}% của ${vnd(c.listAmount)} cho mã ${c.code} · chi trả cuối tháng.`
          : `Khoản hoa hồng ${vnd(c.amount)} đã được ghi nhận cho mã ${c.code} · chi trả cuối tháng.`,
        link: LINK,
      },
    ]);
  }
}
