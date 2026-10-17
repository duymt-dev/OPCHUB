import { describe, expect, it } from 'vitest';
import { addMonths, localPhone, nextPeriod } from './fee-period';
import { canTransition, statusByValidUntil } from './membership-fee.state';

const now = new Date('2026-10-17T00:00:00Z');
const days = (n: number) => new Date(now.getTime() + n * 86_400_000);

describe('máy trạng thái phí', () => {
  it('chỉ cho chuyển hợp lệ', () => {
    expect(canTransition('pending_payment', 'active')).toBe(true);
    expect(canTransition('pending_payment', 'expired')).toBe(false);
    expect(canTransition('expired', 'expiring')).toBe(false);
    expect(canTransition('active', 'active')).toBe(true);
  });

  it('trạng thái theo hạn: >30 ngày active, ≤30 expiring, quá hạn expired', () => {
    expect(statusByValidUntil(null, now)).toBe('pending_payment');
    expect(statusByValidUntil(days(31), now)).toBe('active');
    expect(statusByValidUntil(days(20), now)).toBe('expiring');
    expect(statusByValidUntil(days(-1), now)).toBe('expired');
  });
});

describe('kỳ phí BR-05', () => {
  it('chưa có hạn / đã hết → từ hôm nay + 12 tháng', () => {
    expect(nextPeriod(null, now)).toEqual({
      startsAt: now,
      endsAt: new Date('2027-10-17T00:00:00Z'),
    });
    expect(nextPeriod(days(-5), now).startsAt).toEqual(now);
  });

  it('còn hạn 100 ngày → nối tiếp từ ngày hết hạn', () => {
    const p = nextPeriod(days(100), now);
    expect(p.startsAt).toEqual(days(100));
    expect(p.endsAt).toEqual(addMonths(days(100), 12));
  });

  it('29/02 + 12 tháng → 28/02; SĐT nội địa', () => {
    expect(addMonths(new Date('2028-02-29T05:00:00Z'), 12).toISOString()).toBe(
      '2029-02-28T05:00:00.000Z',
    );
    expect(localPhone('+84912345678')).toBe('0912345678');
    expect(localPhone(null)).toBe('');
  });
});
