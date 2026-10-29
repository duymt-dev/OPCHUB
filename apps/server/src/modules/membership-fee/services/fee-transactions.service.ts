import { Inject, Injectable, Optional } from '@nestjs/common';
import { extractFundraisingCode, extractMemberCode } from '@opchub/integrations';
import type { PendingFundraising, UnmatchedTxn } from '@opchub/shared/api-domains';
import { z } from 'zod';
import { AuditService } from '@/common/audit';
import { conflict, notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MemberDirectory } from '../../account';
import { FUNDRAISING_PAYMENT_PORT, type FundraisingPaymentPort } from '../ports';
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
    @Optional()
    @Inject(FUNDRAISING_PAYMENT_PORT)
    private readonly fundraising: FundraisingPaymentPort | null = null,
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
      fundraisingHint: extractFundraisingCode(r.content),
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

  /** D-113 (F3): khoản Gói Gọi vốn chờ thanh toán cho ô chọn khớp tay */
  async pendingFundraisings(q: string): Promise<{ items: PendingFundraising[] }> {
    return { items: this.fundraising ? await this.fundraising.pending(q) : [] };
  }

  /** D-113 (F3): khớp tay giao dịch vào Gói Gọi vốn → chờ thẩm định (audit + outbox ở domain project) */
  async matchFundraising(
    actor: FeeActor,
    transactionId: string,
    fundraisingId: string,
    reason: string,
    now = new Date(),
  ): Promise<void> {
    const port = this.fundraising;
    if (!port) throw notFound('Không tìm thấy Gói Gọi vốn');
    await this.prisma.db.$transaction(async (tx) => {
      const t = await this.txns.findUnmatched(tx, transactionId);
      if (!t) throw conflict('Giao dịch không còn ở trạng thái chưa khớp');
      const r = await port.payManual(
        tx,
        {
          fundraisingId,
          transactionId: t.id,
          amount: t.amount,
          actorId: actor.id,
          ip: actor.ip,
          reason,
        },
        now,
      );
      if (!r) throw conflict('Gói Gọi vốn không còn chờ thanh toán');
      if (!(await this.txns.markMatched(tx, t.id, r.ownerId, now, 'manual'))) {
        throw conflict('Giao dịch vừa được xử lý bởi thao tác khác');
      }
    });
  }
}
