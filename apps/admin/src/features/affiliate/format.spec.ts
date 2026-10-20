import { describe, expect, it } from 'vitest';
import { affiliateDate, affiliateHistoryDate } from './format';

describe('REQ-312 customer calendar dates match the Vietnam prototype', () => {
  it('uses numeric days and months without changing the supplied date', () => {
    expect(affiliateHistoryDate('2026-10-08T02:00:00Z')).toBe('8/10/2026');
    expect(affiliateHistoryDate('2026-09-01T02:00:00Z')).toBe('1/9/2026');
  });
  it('uses Vietnam rather than UTC at the day boundary', () => {
    expect(affiliateHistoryDate('2026-10-07T18:30:00Z')).toBe('8/10/2026');
  });
  it('preserves an unknown date rather than inventing one', () => {
    expect(affiliateHistoryDate(null)).toBe('—');
  });
  it('does not change padded dates used by other Affiliate screens', () => {
    expect(affiliateDate('2026-10-08T02:00:00Z')).toBe('08/10/2026');
    expect(affiliateDate(null)).toBe('—');
  });
});
