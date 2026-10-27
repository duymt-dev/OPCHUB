import { Injectable } from '@nestjs/common';
import type { OutboxPayload } from '@opchub/shared/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MailService } from './mail.service';
import { feeReceiptMail, fundraisingReceiptMail } from './templates-receipt';

const PLAN_NAME = { personal: 'Gói Cá nhân', business: 'Gói Doanh nghiệp' } as const;

/**
 * D-113 (F4): email biên nhận — consumer outbox `membership_fee.confirmed` (mọi đường xác nhận phí:
 * CK tự khớp, khớp tay, ghi nhận thu) và `fundraising.paid` (CK tự khớp / khớp tay Gọi vốn).
 * Relay có thể gọi lại → tiêu đề chứa mã kỳ / mã GV; đã có `mail_logs` cùng (to, kind, subject) thì bỏ.
 */
@Injectable()
export class ReceiptMailHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async feeConfirmed(p: OutboxPayload<'membership_fee.confirmed'>): Promise<void> {
    const period = await this.prisma.db.membershipFeePeriod.findUnique({
      where: { id: p.periodId },
      select: {
        amount: true,
        endsAt: true,
        user: {
          select: { email: true, fullName: true, membershipFee: { select: { plan: true } } },
        },
      },
    });
    const user = period?.user;
    if (!period || !user?.email) return;
    const r = feeReceiptMail({
      fullName: user.fullName,
      plan: PLAN_NAME[user.membershipFee?.plan ?? 'personal'],
      amount: period.amount,
      validUntil: period.endsAt,
      receiptNo: `BN-${p.periodId.slice(-8).toUpperCase()}`,
    });
    await this.send(user.email, r.subject, r.html);
  }

  async fundraisingPaid(p: OutboxPayload<'fundraising.paid'>): Promise<void> {
    const row = await this.prisma.db.projectFundraising.findUnique({
      where: { id: p.fundraisingId },
      select: { code: true, owner: { select: { email: true, fullName: true } } },
    });
    if (!row?.code || !row.owner.email) return;
    const r = fundraisingReceiptMail({
      fullName: row.owner.fullName,
      projectName: p.projectName,
      code: row.code,
      amount: p.amount,
    });
    await this.send(row.owner.email, r.subject, r.html);
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    const dup = await this.prisma.db.mailLog.findFirst({
      where: { to, kind: 'receipt', subject },
      select: { id: true },
    });
    if (dup) return;
    await this.prisma.db.$transaction((tx) =>
      this.mail.request(tx, { to, kind: 'receipt', subject, html }),
    );
  }
}
