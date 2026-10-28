import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { type AccountType, planAmountOf, planOf, TRIAL_DAYS } from '@opchub/shared';
import { OutboxService } from '@/common/outbox';
import { PriceConfigService } from '@/modules/pricing';
import type { FeeWriter } from '../../account';

const DAY_MS = 86_400_000;

/**
 * D-94 1A (BR-TRIAL-01): tài khoản mới được miễn phí 3 tháng — phí `trial` hết hạn sau 90 ngày, gói
 * theo loại TK lúc đăng ký (D-68); `amount` là giá phải trả khi hết miễn phí. TK Doanh nghiệp: outbox
 * `membership_fee.trial_started` cùng transaction → tạo gian hàng Nháp (CR-16, D-114, TIP-V42-710).
 */
@Injectable()
export class FeeWriterService implements FeeWriter {
  constructor(
    private readonly prices: PriceConfigService,
    private readonly outbox: OutboxService,
  ) {}

  async openFor(
    tx: DbTx,
    userId: string,
    accountType: AccountType,
    now = new Date(),
  ): Promise<void> {
    const plan = planOf(accountType) ?? 'personal';
    // D-94 5A: giá gói hiện hành từ Cấu hình bảng giá
    const prices = await this.prices.current();
    await tx.membershipFee.upsert({
      where: { userId },
      create: {
        userId,
        plan,
        amount: planAmountOf(prices, plan),
        status: 'trial',
        validUntil: new Date(now.getTime() + TRIAL_DAYS * DAY_MS),
      },
      update: {},
    });
    if (accountType === 'business') {
      await this.outbox.add(tx, 'membership_fee.trial_started', { userId, accountType });
    }
  }
}
