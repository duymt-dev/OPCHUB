import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import type { BankTxnQuery, BankTxnRow } from '@opchub/shared/api-domains';
import { extractFundraisingCode, extractMemberCode } from '@opchub/integrations';
import { PrismaService } from '@/common/prisma/prisma.service';
import { bankCountsQuery, bankTransactionsQuery } from './bank-transactions.query';

interface Row {
  id: string;
  amount: number;
  content: string;
  received_at: Date;
  match_status: 'matched' | 'manual' | 'unmatched' | 'short';
  short_note: string | null;
  reason: string | null;
  reason_code: string | null;
  member_name: string | null;
  suggested_name: string | null;
  suggested_code: string | null;
}
@Injectable()
export class BankTransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}
  async page(
    q: BankTxnQuery,
    tx?: DbTx,
  ): Promise<{ items: BankTxnRow[]; nextCursor: string | null }> {
    const rows = await (tx ?? this.prisma.db).$queryRaw<Row[]>(
      bankTransactionsQuery(q.cursor, q.limit + 1),
    );
    const items = rows.slice(0, q.limit).map((r): BankTxnRow => ({
      id: r.id,
      amount: r.amount,
      content: r.content,
      receivedAt: r.received_at.toISOString(),
      memberName: r.member_name,
      status:
        r.match_status === 'unmatched' &&
        (r.reason_code === 'short_amount' || r.reason === 'Số tiền nhỏ hơn phí thành viên')
          ? 'short'
          : r.match_status,
      shortRecorded: r.match_status === 'short',
      shortNote: r.short_note,
      reason: r.reason,
      matchedHint: extractMemberCode(r.content) ?? r.suggested_code,
      fundraisingHint: extractFundraisingCode(r.content),
      suggestedName: r.suggested_name,
    }));
    const last = items.at(-1);
    return {
      items,
      nextCursor:
        rows.length > q.limit && last
          ? JSON.stringify({ receivedAt: last.receivedAt, id: last.id })
          : null,
    };
  }
  async counts() {
    const [row] =
      await this.prisma.db.$queryRaw<{ matched: bigint; pending: bigint }[]>(bankCountsQuery);
    return { matched: Number(row?.matched ?? 0), pending: Number(row?.pending ?? 0) };
  }
  markShort(tx: DbTx, id: string, actor: string, note: string) {
    return tx.paymentTransaction.updateMany({
      where: { id, matchStatus: 'unmatched' },
      data: { matchStatus: 'short', shortBy: actor, shortNote: note },
    });
  }
  async idForFake(bankTxnId: string) {
    const row = await this.prisma.db.paymentTransaction.findUniqueOrThrow({
      where: { provider_bankTxnId: { provider: 'fake', bankTxnId } },
      select: { id: true },
    });
    return row.id;
  }
  async wasAutoMatched(id: string) {
    const row = await this.prisma.db.paymentTransaction.findUniqueOrThrow({
      where: { id },
      select: { matchStatus: true },
    });
    return row.matchStatus === 'matched';
  }
}
