import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { canCommission } from '../domain/affiliate.state';

/** Mọi mutation khoá đại lý theo ID tăng dần trước khi khoá/cập nhật hoa hồng. */
@Injectable()
export class AffiliateWriteRepository {
  async lock(tx: DbTx, ids: readonly string[]) {
    if (!ids.length) return [];
    return tx.$queryRaw<
      {
        id: string;
        userId: string;
        bankName: string | null;
        bankNo: string | null;
        bankHolder: string | null;
      }[]
    >`
      SELECT id,user_id AS "userId",bank_name AS "bankName",bank_no AS "bankNo",bank_holder AS "bankHolder"
      FROM affiliates WHERE id = ANY(${[...ids]}::text[]) ORDER BY id FOR UPDATE`;
  }

  commissions(tx: DbTx, ids: readonly string[]) {
    return tx.commission.findMany({
      where: { id: { in: [...ids] }, amount: { gt: 0 } },
      select: { id: true, affiliateId: true },
    });
  }

  async cancel(tx: DbTx, ids: readonly string[], reason: string, actorId: string, now: Date) {
    if (!canCommission('recorded', 'cancelled')) return [];
    return tx.$queryRaw<{ id: string }[]>`
      UPDATE commissions SET status='cancelled',cancel_reason=${reason},cancelled_at=${now},cancelled_by=${actorId}
      WHERE id = ANY(${[...ids]}::text[]) AND status='recorded' RETURNING id`;
  }

  /** D-110: Đã hủy → Đã ghi nhận (luật 7); khoản đã chi trả không bị chạm */
  async restore(tx: DbTx, ids: readonly string[]) {
    if (!canCommission('cancelled', 'recorded')) return [];
    return tx.$queryRaw<{ id: string }[]>`
      UPDATE commissions SET status='recorded',cancel_reason=NULL,cancelled_at=NULL,cancelled_by=NULL
      WHERE id = ANY(${[...ids]}::text[]) AND status='cancelled' RETURNING id`;
  }

  async rate(tx: DbTx, ids: readonly string[], rate: number, now: Date): Promise<void> {
    await tx.affiliate.updateMany({
      where: { id: { in: [...ids] } },
      data: { rate, updatedAt: now },
    });
    // D-117 B1: khoản Gọi vốn giữ % cố định (BR-GV-06) — chỉ tính lại khoản phí thành viên;
    // D-110: làm tròn đến đồng (như `commissionAmount`)
    await tx.$executeRaw`
      UPDATE commissions SET rate=${rate},amount=round(list_amount::numeric * ${rate} / 100)::integer
      WHERE affiliate_id = ANY(${[...ids]}::text[]) AND status='recorded' AND source='membership' AND customer_year=1
        AND amount > 0 AND round(list_amount::numeric * ${rate} / 100) > 0`;
  }
}
