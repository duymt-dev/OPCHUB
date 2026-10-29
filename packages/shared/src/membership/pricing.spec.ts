import { describe, expect, it } from 'vitest';
import { PRICE_DEFAULTS } from '../fixtures/price-defaults';
import {
  discountPctOf,
  fundAmountOf,
  fundCommissionOf,
  monthlyAboveList,
  monthlyOf,
  planAmountOf,
  priceConfigSchema,
} from './pricing';

describe('Cấu hình bảng giá (D-94 5A)', () => {
  it('giá mặc định §27.2 hợp lệ', () => {
    expect(priceConfigSchema.parse(PRICE_DEFAULTS)).toEqual(PRICE_DEFAULTS);
  });

  it('§27.2(1) giá tháng = năm ÷ 12, % ưu đãi so với niêm yết', () => {
    const c = PRICE_DEFAULTS;
    expect(monthlyOf(c.per.y)).toBe(c.per.y / 12);
    expect(discountPctOf(c.per.list, c.per.y)).toBe(50);
    expect(discountPctOf(c.biz.list, c.biz.y)).toBe(40);
    expect(discountPctOf(0, c.biz.y)).toBe(0);
    expect(discountPctOf(50_000, c.per.y)).toBe(0);
    expect(monthlyAboveList(50_000, c.per.y)).toBe(true);
    expect(monthlyAboveList(c.per.list, c.per.y)).toBe(false);
  });

  it('số thu theo gói và Gọi vốn mới / gia hạn (D-106)', () => {
    const c = PRICE_DEFAULTS;
    expect(planAmountOf(c, 'personal')).toBe(c.per.y);
    expect(planAmountOf(c, 'business')).toBe(c.biz.y);
    expect(fundAmountOf(c, false)).toBe(c.fund.p);
    expect(fundAmountOf(c, true)).toBe(c.fund.r);
  });

  it('D-110 hoa hồng Gọi vốn làm tròn đến đồng', () => {
    expect(fundCommissionOf(1_000_005, 10)).toBe(100_001);
    expect(fundCommissionOf(1_000_004, 10)).toBe(100_000);
  });

  it('prototype prcV: giá bán trống / thời hạn < 1 bị chặn với câu tiếng Việt', () => {
    const bad = priceConfigSchema.safeParse({
      ...PRICE_DEFAULTS,
      per: { list: 1, y: 0 },
    });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0]?.message).toBe('Giá bán không được để trống');
    const mo = priceConfigSchema.safeParse({
      ...PRICE_DEFAULTS,
      fund: { ...PRICE_DEFAULTS.fund, mo: 0 },
    });
    expect(mo.error?.issues[0]?.message).toBe('Thời hạn gói Gọi vốn tối thiểu 1 tháng');
  });
});
