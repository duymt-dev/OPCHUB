import { describe, expect, it } from 'vitest';
import { FUNDRAISING_PLAN, MEMBERSHIP_PLANS, planAmount, planDiscountPct, planOf } from './plans';

describe('Bảng giá v4 (D-68)', () => {
  it('giá năm = 12 × giá tháng, số nguyên VND', () => {
    for (const p of Object.values(MEMBERSHIP_PLANS)) {
      expect(Number.isInteger(p.amount)).toBe(true);
      expect(p.amount).toBe(p.monthly * 12);
    }
    expect(planAmount('personal')).toBe(1_200_000);
    expect(planAmount('business')).toBe(3_600_000);
    expect(FUNDRAISING_PLAN.amount).toBe(15_000_000);
  });

  it('gói theo loại TK; nhà đầu tư không có gói (D-14)', () => {
    expect(planOf('personal')).toBe('personal');
    expect(planOf('business')).toBe('business');
    expect(planOf('investor')).toBeNull();
  });

  it('ưu đãi theo prototype: Cá nhân 50%, Doanh nghiệp 40%', () => {
    expect(planDiscountPct(MEMBERSHIP_PLANS.personal)).toBe(50);
    expect(planDiscountPct(MEMBERSHIP_PLANS.business)).toBe(40);
  });
});
