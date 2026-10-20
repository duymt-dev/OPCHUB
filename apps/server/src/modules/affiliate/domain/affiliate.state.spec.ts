import { describe, expect, it } from 'vitest';
import { canAffiliate, canCommission, canReferral } from './affiliate.state';

describe('máy trạng thái affiliate (§20.5)', () => {
  it('REQ-307 đại lý active ↔ paused', () => {
    expect(canAffiliate('active', 'paused')).toBe(true);
    expect(canAffiliate('paused', 'active')).toBe(true);
    expect(canAffiliate('active', 'active')).toBe(false);
  });

  it('REQ-306 referral pending → converted | void, không quay lại', () => {
    expect(canReferral('pending', 'converted')).toBe(true);
    expect(canReferral('pending', 'void')).toBe(true);
    expect(canReferral('converted', 'pending')).toBe(false);
    expect(canReferral('void', 'converted')).toBe(false);
  });

  it('REQ-309 REQ-310 hoa hồng recorded → paid | cancelled; đã chi không huỷ', () => {
    expect(canCommission('recorded', 'paid')).toBe(true);
    expect(canCommission('recorded', 'cancelled')).toBe(true);
    expect(canCommission('paid', 'cancelled')).toBe(false);
    expect(canCommission('cancelled', 'paid')).toBe(false);
  });
});
