import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { revenueReceiptSchema, type RevenueReceipt } from '@opchub/shared/outbox';
import { conflict, notFound } from '@/common/errors';
import { PaymentReceiptRepository } from '../repositories/payment-receipt.repository';
import { RevenueReceiptRegistry } from './revenue-receipt.registry';

type ReceiptInput = Omit<RevenueReceipt, 'receivedAt' | 'recordedAt'> & {
  paymentTransactionId?: string | undefined;
};

/** Public membership payment facade; project never reads payment_transactions itself. */
@Injectable()
export class PaymentReceiptService {
  constructor(
    private readonly repo: PaymentReceiptRepository,
    private readonly registry: RevenueReceiptRegistry,
  ) {}

  prepare(tx: DbTx): Promise<void> {
    return this.registry.prepare(tx);
  }

  async record(tx: DbTx, input: ReceiptInput, now: Date): Promise<void> {
    const { paymentTransactionId, ...base } = input;
    let receivedAt = now;
    if (paymentTransactionId) {
      const bank = await this.repo.bankReceipt(tx, paymentTransactionId);
      if (!bank) throw notFound('Không tìm thấy giao dịch thực thu');
      if (bank.amount !== input.amount || bank.matchStatus === 'ignored') {
        throw conflict('Giao dịch thực thu không khớp khoản đối soát');
      }
      receivedAt = bank.receivedAt;
    }
    const receipt = revenueReceiptSchema.parse({
      ...base,
      receivedAt: receivedAt.toISOString(),
      recordedAt: now.toISOString(),
    });
    if (receipt.amount === 0) return;
    // For fundraising, markMatched follows capture in the SAME transaction; failure rolls everything back.
    await this.registry.capture(tx, receipt);
  }
}
