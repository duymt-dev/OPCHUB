import { describe, expect, it } from 'vitest';
import {
  customerYearOf,
  payoutMonthOf,
  regionalAmount,
  regionalPercent,
  regionalMinYear,
} from './regional-share';

const policy = { regionalFirstYear: 50, regionalStep: 10, regionalMin: 20 };
describe('regional revenue share', () => {
  it('percent by customer year', () => {
    expect(regionalMinYear(policy)).toBe(4);
    expect(regionalMinYear({ ...policy, regionalStep: 0 })).toBeNull();
    expect([1, 2, 3, 4, 7].map((year) => regionalPercent(year, policy))).toEqual([
      50, 40, 30, 20, 20,
    ]);
    expect(
      [1, 2, 3, 4, 7].map(
        (year) => regionalAmount(1_200_000, regionalPercent(year, policy)).directorAmount,
      ),
    ).toEqual([600_000, 480_000, 360_000, 240_000, 240_000]);
  });
  it('rounding to dong', () => {
    expect(regionalAmount(1_234_567, 30)).toEqual({
      directorAmount: 370_370,
      mediaSoftAmount: 864_197,
    });
  });
  it('customer year boundaries', () => {
    expect(customerYearOf('2026-03-15T00:00:00Z', '2027-03-14T16:59:59Z')).toBe(1);
    expect(customerYearOf('2026-03-15T00:00:00Z', '2027-03-14T17:00:00Z')).toBe(2);
    expect(customerYearOf('2028-02-29T00:00:00Z', '2029-02-27T17:00:00Z')).toBe(2);
    expect(customerYearOf('2028-02-29T00:00:00Z', '2029-02-27T16:59:59Z')).toBe(1);
  });
  it('payout month uses Vietnam midnight', () => {
    expect(payoutMonthOf('2026-10-31T17:00:00Z')).toBe('2026-11');
    expect(payoutMonthOf('2026-10-31T16:59:59Z')).toBe('2026-10');
  });
});
