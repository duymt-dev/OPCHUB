import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import type { PendingFundraising } from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { notFound } from '@/common/errors';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PaymentReceiptService } from '../../membership-fee';
import { FundraisingRepository } from '../repositories/fundraising.repository';

export interface ManualPayInput {
  fundraisingId: string;
  transactionId: string;
  amount: number;
  actorId: string;
  ip: string | null;
  reason: string;
}

interface PendingRow {
  id: string;
  code: string;
  project_name: string;
  owner_name: string;
  owner_code: string;
  amount: number;
  created_at: Date;
}

/**
 * D-113 (F3): kế toán khớp tay giao dịch "Cần đối soát" vào khoản Gói Gọi vốn đang chờ thanh toán →
 * chờ thẩm định. Không kiểm số tiền (như khớp tay phí, QĐ-01); lý do + audit + outbox cùng transaction.
 */
@Injectable()
export class FundraisingManualService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: FundraisingRepository,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly receipts: PaymentReceiptService,
  ) {}

  async payManual(tx: DbTx, input: ManualPayInput, now: Date): Promise<{ ownerId: string } | null> {
    await this.receipts.prepare(tx);
    const r = await tx.projectFundraising.findUnique({
      where: { id: input.fundraisingId },
      select: {
        id: true,
        code: true,
        projectId: true,
        ownerId: true,
        amount: true,
        project: { select: { name: true } },
      },
    });
    if (!r) throw notFound('Không tìm thấy Gói Gọi vốn');
    // Luật 7: chỉ khoản đang `pending_payment` (cập nhật có điều kiện)
    const ok = await this.repo.step(tx, r.id, 'pay', {
      paidAt: now,
      paymentTransactionId: input.transactionId,
    });
    if (!ok) return null;
    await this.receipts.record(
      tx,
      {
        source: 'fundraising',
        sourceId: r.id,
        customerId: r.ownerId,
        plan: 'fundraising',
        amount: input.amount,
        paymentTransactionId: input.transactionId,
      },
      now,
    );
    await this.outbox.add(tx, 'fundraising.paid', {
      fundraisingId: r.id,
      projectId: r.projectId,
      projectName: r.project.name,
      ownerId: r.ownerId,
      amount: r.amount,
    });
    await this.audit.log(tx, {
      actorId: input.actorId,
      ip: input.ip,
      action: 'fundraising.match_transaction',
      entity: 'payment_transaction',
      entityId: input.transactionId,
      tag: 'project',
      summary: `Khớp tay giao dịch ${input.amount.toLocaleString('vi-VN')}đ · Gói Gọi vốn ${r.code ?? ''} · ${r.project.name}`,
      diff: { fundraisingId: r.id, code: r.code, reason: input.reason },
    });
    return { ownerId: r.ownerId };
  }

  /** Partial index `project_fundraisings_pending_created` (status = pending_payment), tối đa 20 */
  async pending(q: string): Promise<PendingFundraising[]> {
    const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const rows = await this.prisma.db.$queryRaw<PendingRow[]>`
      SELECT f.id, f.code, p.name AS project_name, u.full_name AS owner_name,
        u.member_code AS owner_code, f.amount, f.created_at
      FROM project_fundraisings f
      JOIN projects p ON p.id = f.project_id
      JOIN users u ON u.id = f.owner_id
      WHERE f.status = 'pending_payment' AND f.code IS NOT NULL
        AND (${q} = '' OR f.code ILIKE ${like} OR p.name ILIKE ${like} OR u.member_code ILIKE ${like})
      ORDER BY f.created_at DESC
      LIMIT 20`;
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      projectName: r.project_name,
      ownerName: r.owner_name,
      ownerCode: r.owner_code,
      amount: r.amount,
      createdAt: r.created_at.toISOString(),
    }));
  }
}
