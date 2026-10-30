import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';

@Injectable()
export class PaymentReceiptRepository {
  bankReceipt(tx: DbTx, id: string) {
    return tx.paymentTransaction.findUnique({
      where: { id },
      select: { amount: true, receivedAt: true, matchStatus: true },
    });
  }
}
