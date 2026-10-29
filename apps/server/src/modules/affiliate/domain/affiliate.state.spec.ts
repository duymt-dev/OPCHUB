import { describe, expect, it } from 'vitest';
import { canAffiliate, canCommission, canReferral } from './affiliate.state';

describe('máy trạng thái affiliate (§20.5)', () => {
  it('D-110 mã luôn hoạt động: đại lý không chuyển active ↔ paused', () => {
    expect(canAffiliate('active', 'paused')).toBe(false);
    expect(canAffiliate('paused', 'active')).toBe(false);
    expect(canAffiliate('active', 'active')).toBe(false);
  });

  it('REQ-306 referral pending → converted; D-110 không còn void, void cũ không quay lại', () => {
    expect(canReferral('pending', 'converted')).toBe(true);
    expect(canReferral('pending', 'void')).toBe(false);
    expect(canReferral('converted', 'pending')).toBe(false);
    expect(canReferral('void', 'converted')).toBe(false);
  });

  it('REQ-309 REQ-310 hoa hồng recorded → paid | cancelled; đã chi không huỷ', () => {
    expect(canCommission('recorded', 'paid')).toBe(true);
    expect(canCommission('recorded', 'cancelled')).toBe(true);
    expect(canCommission('paid', 'cancelled')).toBe(false);
    expect(canCommission('cancelled', 'paid')).toBe(false);
    // D-110: khôi phục Đã hủy → Đã ghi nhận; đã chi trả vẫn khoá
    expect(canCommission('cancelled', 'recorded')).toBe(true);
    expect(canCommission('paid', 'recorded')).toBe(false);
  });
});
