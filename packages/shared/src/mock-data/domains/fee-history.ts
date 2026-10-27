import type { MyFeePeriods } from '../../api-domains';
import { mockDb } from './store';
import { notFound, ok, type MockResult } from './util';

/**
 * Hồ sơ › "Gói & thanh toán" (D-89, prototype `prBill.rows`): kỳ phí đã đóng của tôi.
 * Mock giữ một kỳ đang có (paidAt → validUntil) như seed prototype; server đọc `membership_fee_periods`.
 */
export function myFeePeriods(userId: string): MockResult<MyFeePeriods> {
  const f = mockDb().fees.find((x) => x.userId === userId);
  if (!f) return notFound('Không tìm thấy phí thành viên');
  if (!f.paidAt || !f.validUntil) return ok({ items: [] });
  return ok({
    items: [
      {
        id: `fp-${f.userId}`,
        startsAt: f.paidAt,
        endsAt: f.validUntil,
        amount: f.amount,
        source: 'transfer',
        paidAt: f.paidAt,
      },
    ],
  });
}
