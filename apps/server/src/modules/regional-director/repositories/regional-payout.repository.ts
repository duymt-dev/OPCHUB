import { Injectable } from '@nestjs/common';
import { type DbTx, Prisma } from '@opchub/db';
import { regionalBankSchema, type RegionalRegion } from '@opchub/shared/api-domains';
import { canPayRegionalShare } from '../domain/regional-share.rules';

@Injectable()
export class RegionalPayoutRepository {
  async receipt(tx: DbTx, id: string) {
    const receipt = await tx.regionalPayout.findUnique({
      where: { id },
      select: {
        id: true,
        amount: true,
        count: true,
        monthKeys: true,
        directorUserId: true,
        bankSnapshot: true,
      },
    });
    return receipt ? { ...receipt, amount: Number(receipt.amount) } : null;
  }
  async bank(tx: DbTx, region: RegionalRegion, userId: string) {
    const [slot] = await tx.$queryRaw<
      {
        userId: string | null;
        bankName: string | null;
        bankNo: string | null;
        bankHolder: string | null;
      }[]
    >`
      SELECT user_id AS "userId",bank_name AS "bankName",bank_no AS "bankNo",bank_holder AS "bankHolder"
      FROM regional_directors WHERE region = ${region}::region FOR SHARE`;
    if (slot?.userId === userId) {
      const bank = regionalBankSchema.safeParse(slot);
      return bank.success ? bank.data : null;
    }
    const [previous] = await tx.$queryRaw<{ bank: unknown }[]>`
      SELECT bank FROM (
        (SELECT bank_snapshot AS bank, paid_at AS at FROM regional_payouts
          WHERE region = ${region}::region AND director_user_id = ${userId}
          ORDER BY paid_at DESC,id DESC LIMIT 1)
        UNION ALL
        (SELECT bank_snapshot AS bank, created_at AS at FROM regional_director_events
          WHERE region = ${region}::region AND user_id = ${userId} AND action = 'revoke'
          AND bank_snapshot IS NOT NULL ORDER BY created_at DESC,id DESC LIMIT 1)
      ) banks ORDER BY at DESC LIMIT 1`;
    const bank = regionalBankSchema.safeParse(previous?.bank);
    return bank.success ? bank.data : null;
  }
  pending(tx: DbTx, region: RegionalRegion, userId: string, month: string) {
    return tx.$queryRaw<{ id: string; directorAmount: number; monthKey: string }[]>`
      SELECT locked.id,locked.director_amount AS "directorAmount",locked.month_key AS "monthKey"
      FROM (SELECT id,month_key FROM regional_shares
        WHERE region = ${region}::region AND director_user_id = ${userId} AND status = 'pending'
          AND month_key < ${month} ORDER BY month_key,id) page
      JOIN LATERAL (SELECT id,director_amount,month_key FROM regional_shares
        WHERE id=page.id AND status='pending' LIMIT 1 FOR UPDATE) locked ON true
      ORDER BY page.month_key,page.id`;
  }
  create(tx: DbTx, data: Prisma.RegionalPayoutUncheckedCreateInput) {
    return tx.regionalPayout.create({ data, select: { id: true } });
  }
  async markPaid(tx: DbTx, ids: string[], payoutId: string) {
    if (!canPayRegionalShare('pending')) return 0;
    const result = await tx.regionalShare.updateMany({
      where: { id: { in: ids }, status: 'pending' },
      data: { status: 'paid', payoutId },
    });
    return result.count;
  }
}
