import { describe, expect, it } from 'vitest';
import { revenueRetainedSchema } from './revenue-dashboard';

describe('REQ-617 exact retained revenue scopes', () => {
  it('preserves values beyond safe Number precision, including empty totals', () => {
    for (const value of ['0', '9007199254740993']) {
      const row = { allReceipts: value, affiliateAttributed: value };
      expect(revenueRetainedSchema.parse(row)).toEqual(row);
    }
  });
  it.each([-1, 1, '-1', '1.5', '01', '1e2', ''])('rejects non-canonical VND %s', (value) => {
    expect(
      revenueRetainedSchema.safeParse({ allReceipts: value, affiliateAttributed: '0' }).success,
    ).toBe(false);
  });
  it('rejects attributed revenue greater than the global total and unrelated payloads', () => {
    expect(
      revenueRetainedSchema.safeParse({ allReceipts: '10', affiliateAttributed: '11' }).success,
    ).toBe(false);
    expect(
      revenueRetainedSchema.safeParse({ allReceipts: '10', affiliateAttributed: '5', net: 5 })
        .success,
    ).toBe(false);
  });
});
