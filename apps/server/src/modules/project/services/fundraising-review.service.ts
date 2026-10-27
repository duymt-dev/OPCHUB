import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import type { FundraisingDecision } from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { AppError, conflict, notFound } from '@/common/errors';
import { PriceConfigService } from '@/modules/pricing';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { FundraisingPayer, FundraisingPaymentPort } from '../../membership-fee';
import { activeWindow } from '../domain/fundraising-status';
import { FundraisingRepository, type FundraisingRow } from '../repositories/fundraising.repository';
import type { Actor } from './project-admin.service';

type RefRow = Pick<FundraisingRow, 'id' | 'projectId' | 'ownerId' | 'amount' | 'project'>;
const ref = (r: RefRow) => ({
  fundraisingId: r.id,
  projectId: r.projectId,
  projectName: r.project.name,
  ownerId: r.ownerId,
  amount: r.amount,
});

/**
 * V4-610: đối soát CK Gói Gọi vốn (cổng cho membership-fee) + Admin thẩm định (AD-06).
 * Chuyển trạng thái có điều kiện; audit + outbox cùng transaction (luật 7, 8, 10).
 */
@Injectable()
export class FundraisingReviewService implements FundraisingPaymentPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: FundraisingRepository,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly prices: PriceConfigService,
  ) {}

  /** Đủ tiền → chờ thẩm định. Chuyển dư nhận (như phí thành viên); thiếu → không khớp */
  async pay(
    tx: DbTx,
    input: {
      code: string;
      amount: number;
      transactionId: string;
      payer?: FundraisingPayer | null;
    },
    now: Date,
  ): Promise<{ ownerId: string } | { reason: string }> {
    const r = await this.repo.lockByCode(tx, input.code);
    if (!r) return { reason: `Không có Gói Gọi vốn ${input.code}` };
    if (r.status !== 'pending_payment') return { reason: `Gói Gọi vốn ${input.code} đã xử lý` };
    if (input.payer && input.payer.id !== r.ownerId) {
      return { reason: `${input.payer.memberCode} không phải chủ Gói Gọi vốn ${input.code}` };
    }
    if (input.amount < r.amount)
      throw new AppError('VALIDATION_ERROR', 'Số tiền nhỏ hơn Gói Gọi vốn');
    const ok = await this.repo.step(tx, r.id, 'pay', {
      paidAt: now,
      paymentTransactionId: input.transactionId,
    });
    if (!ok) return { reason: `Gói Gọi vốn ${input.code} đã xử lý` };
    await this.outbox.add(tx, 'fundraising.paid', ref(r));
    return { ownerId: r.ownerId };
  }

  /**
   * Duyệt → hiển thị `fund.mo` tháng (Cấu hình bảng giá) (nối tiếp khoản còn hạn); từ chối → báo chủ dự án.
   * Hoa hồng Gọi vốn ghi ở consumer `fundraising.reviewed` (affiliate, D-70).
   */
  async review(
    actor: Actor,
    projectId: string,
    id: string,
    decision: FundraisingDecision,
    note: string | undefined,
    now = new Date(),
  ): Promise<void> {
    await this.prisma.db.$transaction(async (tx) => {
      const r = await tx.projectFundraising.findFirst({
        where: { id, projectId, project: { deletedAt: null } },
        select: {
          id: true,
          code: true,
          amount: true,
          ownerId: true,
          projectId: true,
          project: { select: { name: true } },
        },
      });
      if (!r) throw notFound('Không tìm thấy Gói Gọi vốn');
      const base = { reviewedBy: actor.id, reviewedAt: now, reviewNote: note ?? null };
      let ok: boolean;
      if (decision === 'approve') {
        const win = activeWindow(
          now,
          (await this.prices.current()).fund.mo,
          await this.repo.activeEnd(tx, projectId, id),
        );
        ok = await this.repo.step(tx, id, 'approve', { ...base, ...win });
      } else {
        ok = await this.repo.step(tx, id, 'reject', base);
      }
      if (!ok) throw conflict('Gói Gọi vốn không ở trạng thái chờ thẩm định');
      await this.audit.log(tx, {
        actorId: actor.id,
        action: `project.fundraising_${decision}`,
        entity: 'project_fundraising',
        entityId: id,
        tag: 'project',
        summary: `${decision === 'approve' ? 'Duyệt' : 'Từ chối'} Gói Gọi vốn ${r.code ?? ''} · ${r.project.name}`,
        ip: actor.ip,
      });
      await this.outbox.add(tx, 'fundraising.reviewed', {
        ...ref(r),
        decision,
        reviewedAt: now.toISOString(),
      });
    });
  }
}
