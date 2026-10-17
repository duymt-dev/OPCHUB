import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import type { FeeWriter } from '../account';

/** BR-01: tài khoản mới có phí `pending_payment` (600.000đ — mặc định cột) */
@Injectable()
export class FeeWriterService implements FeeWriter {
  async openFor(tx: DbTx, userId: string): Promise<void> {
    await tx.membershipFee.upsert({ where: { userId }, create: { userId }, update: {} });
  }
}
