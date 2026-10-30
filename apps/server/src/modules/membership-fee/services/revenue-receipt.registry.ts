import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import type { RevenueReceipt } from '@opchub/shared/outbox';
import { conflict } from '@/common/errors';

export interface RevenueReceiptPort {
  prepare(tx: DbTx): Promise<void>;
  capture(tx: DbTx, receipt: RevenueReceipt): Promise<void>;
}

/** Same registry pattern as Account/Referral: no reverse import or optional lost money. */
@Injectable()
export class RevenueReceiptRegistry implements RevenueReceiptPort {
  private delegate?: RevenueReceiptPort;

  register(port: RevenueReceiptPort): void {
    this.delegate = port;
  }

  private require(): RevenueReceiptPort {
    if (!this.delegate) throw conflict('Sổ chia sẻ chưa sẵn sàng, vui lòng đối soát lại');
    return this.delegate;
  }

  prepare(tx: DbTx): Promise<void> {
    return this.require().prepare(tx);
  }

  capture(tx: DbTx, receipt: RevenueReceipt): Promise<void> {
    return this.require().capture(tx, receipt);
  }
}
