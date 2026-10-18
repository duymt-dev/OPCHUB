import { Injectable } from '@nestjs/common';
import type { OutboxPayload } from '@opchub/shared/outbox';
import { toPlainText } from '@/common/html/sanitize';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationService } from '../../notification';

export const INVESTOR_REPLIED_TITLE = 'OPC Hub đã phản hồi quan tâm đầu tư của bạn';
const BODY_MAX = 90;

interface ReplyRow {
  user_id: string;
  project_id: string | null;
  body: string;
}

/**
 * Consumer outbox `investor.admin_replied` (IV-R01, AT-IV01): mỗi tin Admin → MỘT thông báo `invest`
 * cho nhà đầu tư, bấm mở dự án quan tâm đầu tiên. Relay chạy lại có thể tạo trùng thông báo — chấp
 * nhận theo quy ước `NotificationService.notify` (không phải tiền).
 */
@Injectable()
export class InvestorNotifyHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  async adminReplied(p: OutboxPayload<'investor.admin_replied'>): Promise<void> {
    const [row] = await this.prisma.db.$queryRaw<ReplyRow[]>`
      SELECT s.user_id, i.project_id, c.body
      FROM investor_comments c
      JOIN investor_summaries s ON s.investor_key = c.investor_key
      LEFT JOIN investor_interests i ON i.id = s.first_interest_id
      WHERE c.id = ${p.commentId} AND c.investor_key = ${p.investorKey}`;
    if (!row) return;
    await this.notifications.notify([
      {
        userId: row.user_id,
        type: 'invest',
        title: INVESTOR_REPLIED_TITLE,
        body: toPlainText(row.body).slice(0, BODY_MAX),
        link: row.project_id ? `/projects/${row.project_id}` : '/projects',
      },
    ]);
  }
}
