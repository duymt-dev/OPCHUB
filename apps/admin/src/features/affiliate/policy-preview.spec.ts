import { describe, expect, it } from 'vitest';
import { policyPlanAmounts, policyYears, previewPolicy } from './policy-preview';

const base = { yearOneRate: 50, annualDecrease: 10, minimumRate: 20 };
describe('REQ-617 D-119 sharing-policy presentation math', () => {
  it('shows the configured default schedule, not reference-commission percentages', () => {
    expect(policyYears(base)).toEqual([
      { year: 1, rate: 50, mediaSoft: 50, ongoing: false },
      { year: 2, rate: 40, mediaSoft: 60, ongoing: false },
      { year: 3, rate: 30, mediaSoft: 70, ongoing: false },
      { year: 4, rate: 20, mediaSoft: 80, ongoing: true },
    ]);
  });
  it('never labels year4 as a permanent floor for a later-floor policy', () => {
    const rows = policyYears({ yearOneRate: 63, annualDecrease: 7, minimumRate: 21 });
    expect(rows.map((r) => r.rate)).toEqual([63, 56, 49, 42, 35, 28, 21]);
    expect(rows.filter((r) => r.ongoing).map((r) => r.year)).toEqual([7]);
  });
  it.each([
    { yearOneRate: 70, annualDecrease: 0, minimumRate: 20 },
    { yearOneRate: 20, annualDecrease: 10, minimumRate: 20 },
    { yearOneRate: 0, annualDecrease: 0, minimumRate: 0 },
  ])('constant policy stays at its actual year-one rate: %o', (policy) => {
    expect(policyYears(policy)).toEqual([
      { year: 1, rate: policy.yearOneRate, mediaSoft: 100 - policy.yearOneRate, ongoing: true },
    ]);
  });
  it('handles a floor reached before year4 and a bounded maximal schedule', () => {
    expect(policyYears({ ...base, annualDecrease: 100 }).map((r) => r.rate)).toEqual([50, 20]);
    expect(policyYears({ yearOneRate: 100, annualDecrease: 1, minimumRate: 0 })).toHaveLength(101);
  });
  it('conserves actual integer VND in all percentages, including zero-price preview', () => {
    for (const amount of [0, 1, 101, 1200001, Number.MAX_SAFE_INTEGER]) {
      for (const rate of [0, 7, 21, 50, 63, 100]) {
        const result = policyPlanAmounts(amount, rate);
        expect(result.directorAmount + result.mediaSoftAmount).toBe(amount);
        expect(Number.isSafeInteger(result.directorAmount)).toBe(true);
      }
    }
    expect(policyPlanAmounts(101, 63)).toEqual({ directorAmount: 64, mediaSoftAmount: 37 });
  });
  it('uses valid form data without coercing an invalid draft or filling defaults', () => {
    expect(previewPolicy({ ...base, cookieDays: 30 })).toEqual(base);
    for (const draft of [
      undefined,
      {},
      { ...base, minimumRate: 51 },
      { ...base, yearOneRate: '50' },
    ])
      expect(previewPolicy(draft)).toBeNull();
  });
});
