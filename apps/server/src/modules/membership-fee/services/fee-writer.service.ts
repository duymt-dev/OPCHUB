import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { type AccountType, planAmount, planOf, TRIAL_DAYS } from '@opchub/shared';
import type { FeeWriter } from '../../account';

const DAY_MS = 86_400_000;

/**
 * D-94 1A (BR-TRIAL-01): tài khoản mới được miễn phí 3 tháng — phí `trial` hết hạn sau 90 ngày, gói
 * theo loại TK lúc đăng ký (D-68); `amount` là giá phải trả khi hết miễn phí.
 */
@Injectable()
export class FeeWriterService implements FeeWriter {
  async openFor(
    tx: DbTx,
    userId: string,
    accountType: AccountType,
    now = new Date(),
  ): Promise<void> {
    const plan = planOf(accountType) ?? 'personal';
    await tx.membershipFee.upsert({
      where: { userId },
      create: {
        userId,
        plan,
        amount: planAmount(plan),
        status: 'trial',
        validUntil: new Date(now.getTime() + TRIAL_DAYS * DAY_MS),
      },
      update: {},
    });
  }
}
