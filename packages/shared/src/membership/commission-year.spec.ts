import { describe, expect, it } from 'vitest';
import { commissionRateFor } from './commission-year';
describe('D-131 commission customer year', () => {
  it('years 1..4 and no zero row', () => {
    const p = { firstYearRate: 20, renewalRate: 10, renewalMaxYear: 3 };
    expect([1, 2, 3, 4].map((y) => commissionRateFor(y, p))).toEqual([20, 10, 10, null]);
    expect(commissionRateFor(2, { ...p, renewalRate: 0 })).toBeNull();
    expect(commissionRateFor(0, p)).toBeNull();
  });
});
