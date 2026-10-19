import { Injectable } from '@nestjs/common';
import { extractMemberCode } from '@opchub/integrations';
import type { UnmatchedTxn } from '@opchub/shared/api-domains';
import { z } from 'zod';
import { AuditService } from '@/common/audit';
import { conflict, notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MemberDirectory } from '../../account';
import { AdminFeesRepository } from '../repositories/admin-fees.repository';
import { PaymentTransactionRepository } from '../repositories/payment-transaction.repository';
import type { FeeActor } from './admin-fees.service';
import { MembershipFeeService } from './membership-fee.service';

const rawReason = z.object({ _unmatchedReason: z.string() }).partial();

/** Q-B15-2: hàng đợi giao dịch không khớp + Admin khớp tay (kích hoạt kỳ `manual`, D-41) */
@Injectable()
export class FeeTransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: AdminFeesRepository,
    private readonly txns: PaymentTransactionRepository,
    private readonly fees: MembershipFeeService,
    private readonly members: MemberDirectory,
    private readonly audit: AuditService,
  ) {}

  async unmatched(
    before: string | undefined,
    size: number,
  ): Promise<{ items: UnmatchedTxn[]; nextBefore: string | null }> {
    const rows = await this.repo.unmatched(before ? new Date(before) : null, size);
    const items = rows.map((r) => ({
      id: r.id,
      amount: r.amount,
      content: r.content,
      receivedAt: r.receivedAt.toISOString(),
      reason: rawReason.safeParse(r.raw).data?._unmatchedReason ?? null,
      // BUG-014: Mã TV đọc được trong nội dung CK — gợi ý cho kế toán (thuần, không query thêm)
      matchedHint: extractMemberCode(r.content),
    }));
    const last = items.at(-1);
    return { items, nextBefore: items.length === size && last ? last.receivedAt : null };
  }

  /** Khớp tay: giao dịch `unmatched` → `manual` + kích hoạt kỳ phí trong cùng transaction */
  async match(
    actor: FeeActor,
    transactionId: string,
    userId: string,
    reason: string,
    now = new Date(),
  ): Promise<void> {
    const member = await this.members.byId(userId);
    if (!member) throw notFound('Không tìm thấy thành viên');
    await this.prisma.db.$transaction(async (tx) => {
      const t = await this.txns.findUnmatched(tx, transactionId);
      if (!t) throw conflict('Giao dịch không còn ở trạng thái chưa khớp');
      if (!(await this.txns.markMatched(tx, t.id, userId, now, 'manual'))) {
        throw conflict('Giao dịch vừa được xử lý bởi thao tác khác');
      }
      await this.fees.activate(
        tx,
        {
          userId,
          amount: t.amount,
          source: 'manual',
          paymentTransactionId: t.id,
          collectedBy: actor.id,
          reason,
        },
        now,
      );
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'fee.match_transaction',
        entity: 'payment_transaction',
        entityId: t.id,
        tag: 'member',
        summary: `Khớp tay giao dịch ${t.amount.toLocaleString('vi-VN')}đ · ${member.fullName}`,
        diff: { userId, reason },
        ip: actor.ip,
      });
    });
  }
}
