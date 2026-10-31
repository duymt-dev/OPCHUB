import { describe, expect, it } from 'vitest';
import { affiliatePolicySchema } from './affiliate';

const valid = {
  defaultRate: 20,
  cookieDays: 30,
  fundraisingRate: 10,
  terms: '',
  yearOneRate: 63,
  annualDecrease: 7,
  minimumRate: 21,
};
describe('REQ-617 complete affiliate policy contract', () => {
  it('retains the three configured sharing values and strips database-only metadata', () => {
    expect(affiliatePolicySchema.parse({ ...valid, id: 1 })).toEqual(valid);
  });
  it.each(['yearOneRate', 'annualDecrease', 'minimumRate'] as const)(
    'requires integer percentage %s without implicit defaults or coercion',
    (field) => {
      for (const value of [undefined, null, '50', -1, 101, 2.5]) {
        const result = affiliatePolicySchema.safeParse({ ...valid, [field]: value });
        expect(result.success).toBe(false);
        if (!result.success) expect(result.error.issues[0]?.path).toEqual([field]);
      }
    },
  );
  it('preserves the shared cross-field constraint and permits valid zero/equal rates', () => {
    const bad = affiliatePolicySchema.safeParse({ ...valid, minimumRate: 64 });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.error.issues[0]?.path).toEqual(['minimumRate']);
    expect(
      affiliatePolicySchema.safeParse({
        ...valid,
        yearOneRate: 0,
        annualDecrease: 0,
        minimumRate: 0,
      }).success,
    ).toBe(true);
  });
});
