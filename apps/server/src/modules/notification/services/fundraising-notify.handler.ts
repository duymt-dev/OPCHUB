import { Injectable } from '@nestjs/common';
import type { OutboxPayload } from '@opchub/shared/outbox';
import { fundraisingLine } from '../../mail';
import { NotificationService } from './notification.service';

const link = (projectId: string) => `/projects/${encodeURIComponent(projectId)}`;

/**
 * V4-610 (UP-11, D-82): thông báo chủ dự án về Gói Gọi vốn — đã nhận thanh toán, Admin duyệt / từ
 * chối, sắp hết hạn / hết hạn. Câu chữ theo prototype v4. Id cố định → relay chạy lại không trùng.
 */
@Injectable()
export class FundraisingNotifyHandler {
  constructor(private readonly notifications: NotificationService) {}

  async paid(p: OutboxPayload<'fundraising.paid'>): Promise<void> {
    await this.notifications.notify([
      {
        id: `fundraising:paid:${p.fundraisingId}`,
        userId: p.ownerId,
        type: 'invest',
        title: 'Đã nhận Gói Gọi vốn · chờ Admin thẩm định',
        body: `${p.projectName} sẽ hiển thị ở mục Gọi vốn sau khi được duyệt.`,
        link: link(p.projectId),
      },
    ]);
  }

  async reviewed(p: OutboxPayload<'fundraising.reviewed'>): Promise<void> {
    const ok = p.decision === 'approve';
    await this.notifications.notify([
      {
        // D-113 (F6): gửi lại → thẩm định lần nữa; id theo lần thẩm định để lần sau vẫn tới chủ dự án
        id: `fundraising:${p.decision}:${p.fundraisingId}:${p.reviewedAt}`,
        userId: p.ownerId,
        type: 'invest',
        title: ok
          ? `Gói Gọi vốn đã được duyệt: ${p.projectName}`
          : `Gói Gọi vốn bị từ chối: ${p.projectName}`,
        body: ok
          ? 'Dự án hiển thị ở mục Gọi vốn trong 6 tháng.'
          : 'Admin sẽ liên hệ để hoàn tất hồ sơ.',
        link: link(p.projectId),
      },
    ]);
  }

  async reminded(p: OutboxPayload<'fundraising.reminded'>): Promise<void> {
    await this.notifications.notify(
      p.items.map((i) => ({
        id: `fundraising:${i.kind}:${i.fundraisingId}`,
        userId: i.ownerId,
        type: 'invest' as const,
        title: i.kind === 'renew' ? 'Gói Gọi vốn sắp hết hạn' : 'Gói Gọi vốn đã hết hạn',
        body: fundraisingLine(i.kind, i.projectName, new Date(i.endsAt)),
        link: link(i.projectId),
      })),
    );
  }
}
