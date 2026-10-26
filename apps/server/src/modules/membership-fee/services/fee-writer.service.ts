import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { type AccountType, planAmount, planOf } from '@opchub/shared';
import type { FeeWriter } from '../../account';

/** BR-01 + D-68: tài khoản mới có phí `pending_payment` theo gói của loại TK lúc đăng ký */
@Injectable()
export class FeeWriterService implements FeeWriter {
  async openFor(tx: DbTx, userId: string, accountType: AccountType): Promise<void> {
    const plan = planOf(accountType) ?? 'personal';
    await tx.membershipFee.upsert({
      where: { userId },
      create: { userId, plan, amount: planAmount(plan) },
      update: {},
    });
  }
}
