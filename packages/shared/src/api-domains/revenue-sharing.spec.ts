import { describe, expect, it } from 'vitest';
import { revenueSharingPolicySchema } from './revenue-sharing';

describe('REQ-617 D-119 sharing policy contract', () => {
  it('accepts configured rates, including a zero rate and no annual decrease', () => {
    for (const policy of [
      { yearOneRate: 50, annualDecrease: 10, minimumRate: 20 },
      { yearOneRate: 73, annualDecrease: 0, minimumRate: 12 },
      { yearOneRate: 0, annualDecrease: 0, minimumRate: 0 },
      { yearOneRate: 100, annualDecrease: 100, minimumRate: 0 },
    ]) {
      expect(revenueSharingPolicySchema.parse(policy)).toEqual(policy);
    }
  });

  it('rejects missing defaults, invalid ranges, fractions and inverted floor', () => {
    const valid = { yearOneRate: 50, annualDecrease: 10, minimumRate: 20 };
    for (const policy of [
      {},
      { ...valid, yearOneRate: 101 },
      { ...valid, annualDecrease: -1 },
      { ...valid, annualDecrease: 0.5 },
      { ...valid, minimumRate: 51 },
      { ...valid, yearOneRate: '50' },
      { ...valid, unknown: true },
    ]) {
      expect(revenueSharingPolicySchema.safeParse(policy).success).toBe(false);
    }
  });

  it('reports the inconsistent floor on the editable field', () => {
    const result = revenueSharingPolicySchema.safeParse({
      yearOneRate: 20,
      annualDecrease: 10,
      minimumRate: 30,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['minimumRate']);
  });
});
