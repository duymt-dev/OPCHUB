import type { DbTx } from '../../src/client';
import { buildBankDemoRows } from '@opchub/shared/mock-domains';

export async function seedPaymentTransactions(tx: DbTx): Promise<void> {
  await tx.paymentTransaction.createMany({
    data: buildBankDemoRows().map((r, i) => ({
      id: r.id,
      provider: 'fake',
      bankTxnId: r.id,
      amount: r.amount,
      content: r.content,
      receivedAt: new Date(r.receivedAt),
      matchStatus: r.status === 'short' ? 'unmatched' : r.status,
      matchedUserId: r.memberName ? `m${i + 1}` : null,
      matchedAt: r.memberName ? new Date(r.receivedAt) : null,
      raw: r.reason
        ? {
            _unmatchedReason: r.reason,
            _unmatchedCode: r.status === 'short' ? 'short_amount' : 'unmatched',
          }
        : {},
    })),
    skipDuplicates: true,
  });
}
