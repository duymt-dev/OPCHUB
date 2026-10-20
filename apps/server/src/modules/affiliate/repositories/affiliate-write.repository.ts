import { Injectable } from '@nestjs/common';
import { Prisma, type DbTx } from '@opchub/db';
import type { AffiliateBank } from '@opchub/shared/api-domains';
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
      where: { id: { in: [...ids] } },
      select: { id: true, affiliateId: true },
    });
  }

  async cancel(tx: DbTx, ids: readonly string[], reason: string, actorId: string, now: Date) {
    if (!canCommission('recorded', 'cancelled')) return [];
    return tx.$queryRaw<{ id: string }[]>`
      UPDATE commissions SET status='cancelled',cancel_reason=${reason},cancelled_at=${now},cancelled_by=${actorId}
      WHERE id = ANY(${[...ids]}::text[]) AND status='recorded' RETURNING id`;
  }

  async rate(tx: DbTx, ids: readonly string[], rate: number, now: Date): Promise<void> {
    await tx.affiliate.updateMany({
      where: { id: { in: [...ids] } },
      data: { rate, updatedAt: now },
    });
    await tx.$executeRaw`
      UPDATE commissions SET rate=${rate},amount=((list_amount::bigint * ${rate}) / 100)::integer
      WHERE affiliate_id = ANY(${[...ids]}::text[]) AND status='recorded'`;
  }

  async paid(
    tx: DbTx,
    affiliateId: string,
    month: string,
    bank: AffiliateBank,
    actorId: string,
    payoutId: string,
    now: Date,
  ) {
    if (!canCommission('recorded', 'paid')) return { paid: 0, amount: 0 };
    const [r] = await tx.$queryRaw<{ paid: number; amount: bigint }[]>(Prisma.sql`
      WITH changed AS (
        UPDATE commissions SET status='paid',paid_at=${now},paid_by=${actorId},
          paid_bank_snapshot=${JSON.stringify({ ...bank, payoutId })}::jsonb
        WHERE affiliate_id=${affiliateId} AND month_key=${month} AND status='recorded' RETURNING amount
      ) SELECT count(*)::integer AS paid,COALESCE(sum(amount),0)::bigint AS amount FROM changed`);
    return { paid: r?.paid ?? 0, amount: Number(r?.amount ?? 0) };
  }

  async receipt(tx: DbTx, affiliateId: string, month: string, payoutId: string) {
    const [r] = await tx.$queryRaw<{ paid: number; amount: bigint }[]>`
      SELECT count(*)::integer AS paid,COALESCE(sum(amount),0)::bigint AS amount FROM commissions
      WHERE affiliate_id=${affiliateId} AND month_key=${month} AND status='paid'
        AND paid_bank_snapshot->>'payoutId'=${payoutId}`;
    return { paid: r?.paid ?? 0, amount: Number(r?.amount ?? 0) };
  }
}
