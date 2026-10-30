import { describe, expect, it } from 'vitest';
import {
  revenueDate,
  revenueMoney,
  revenuePeriodEnd,
  revenuePolicySteps,
} from './revenue-presentation';

describe('REQ-617 revenue presentation', () => {
  it('never loses a VND when aggregate strings exceed safe Number precision', () => {
    expect(revenueMoney('9007199254740993')).toBe('9.007.199.254.740.993đ');
    expect(revenueMoney(51)).toBe('51đ');
  });
  it('uses Vietnam calendar and leap-month end', () => {
    expect(revenueDate('2026-09-30T17:00:00Z')).toBe('1/10/2026');
    expect(revenuePeriodEnd('2024-01-31T17:00:00Z')).toBe('29/2/2024');
  });
  it('reads all policy parameters, including a floor reached later than year4 or never decreasing', () => {
    expect(
      revenuePolicySteps({ yearOneRate: 50, annualDecrease: 10, minimumRate: 20 }),
    ).toMatchObject({
      years: [
        { year: 1, rate: 50 },
        { year: 2, rate: 40 },
        { year: 3, rate: 30 },
      ],
      floorYear: 4,
    });
    expect(
      revenuePolicySteps({ yearOneRate: 63, annualDecrease: 7, minimumRate: 21 }).floorYear,
    ).toBe(7);
    expect(
      revenuePolicySteps({ yearOneRate: 63, annualDecrease: 0, minimumRate: 21 }),
    ).toMatchObject({ constant: true, first: 63, floorYear: null });
  });
});
