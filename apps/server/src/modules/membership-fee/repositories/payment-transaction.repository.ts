import { Injectable } from '@nestjs/common';
import type { DbTx, Prisma } from '@opchub/db';
import type { BankTxn } from '@opchub/integrations';
import { PrismaService } from '@/common/prisma/prisma.service';

/** Bảng payment_transactions + membership_fee_periods (đối soát D-41) */
@Injectable()
export class PaymentTransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lưu idempotent: webhook + quét bù cùng giao dịch → một dòng.
   * `ON CONFLICT (provider, bank_txn_id) DO NOTHING`; trả id (mới hoặc đã có).
   */
  async upsert(provider: string, t: BankTxn): Promise<string> {
    const raw = JSON.stringify(t.raw);
    const rows = await this.prisma.db.$queryRaw<{ id: string }[]>`
      INSERT INTO payment_transactions (id, provider, bank_txn_id, amount, content, received_at, raw)
      VALUES (gen_random_uuid()::text, ${provider}, ${t.bankTxnId}, ${t.amount}, ${t.content},
              ${t.receivedAt}, ${raw}::jsonb)
      ON CONFLICT (provider, bank_txn_id) DO NOTHING
      RETURNING id`;
    if (rows[0]) return rows[0].id;
    const existing = await this.prisma.db.paymentTransaction.findUniqueOrThrow({
      where: { provider_bankTxnId: { provider, bankTxnId: t.bankTxnId } },
      select: { id: true },
    });
    return existing.id;
  }

  findUnmatched(tx: DbTx, id: string) {
    return tx.paymentTransaction.findFirst({
      where: { id, matchStatus: 'unmatched' },
      select: { id: true, amount: true, content: true, receivedAt: true },
    });
  }

  /** Chỉ khớp một lần: `WHERE match_status = 'unmatched'` (rule 8) */
  async markMatched(
    tx: DbTx,
    id: string,
    userId: string,
    at: Date,
    how: 'matched' | 'manual' = 'matched',
  ): Promise<boolean> {
    const r = await tx.paymentTransaction.updateMany({
      where: { id, matchStatus: 'unmatched' },
      data: { matchStatus: how, matchedUserId: userId, matchedAt: at },
    });
    return r.count === 1;
  }

  /** Ghi chú lý do không khớp vào raw (Admin xem ở B15), vẫn `unmatched` */
  async noteUnmatched(tx: DbTx, id: string, reason: string): Promise<void> {
    await tx.$executeRaw`
      UPDATE payment_transactions
      SET raw = raw || jsonb_build_object('_unmatchedReason', ${reason}::text)
      WHERE id = ${id} AND match_status = 'unmatched'`;
  }

  /** Trả id kỳ + có phải kỳ đầu tiên của người này (AF-R05) — đếm trong tx sau khoá dòng phí */
  async addPeriod(
    tx: DbTx,
    data: Prisma.MembershipFeePeriodUncheckedCreateInput,
  ): Promise<{ id: string; isFirst: boolean }> {
    const prior = await tx.membershipFeePeriod.count({ where: { userId: data.userId } });
    const row = await tx.membershipFeePeriod.create({ data, select: { id: true } });
    return { id: row.id, isFirst: prior === 0 };
  }
}
