import { describe, expect, it } from 'vitest';
import { affiliateCostRatio, affiliatePayoutCalendar } from './summary-presentation';

describe('REQ-312 Affiliate summary caption formatting', () => {
  it('formats a cost ratio without recalculating any VND amount or dividing by a fixed fee', () => {
    expect(affiliateCostRatio(7470000, 30000000)).toBe('24.9');
    expect(affiliateCostRatio(0, 30000000)).toBe('0');
    expect(affiliateCostRatio(0, 0)).toBeUndefined();
  });
  it('uses the Vietnam calendar at the UTC month/year boundary', () => {
    expect(affiliatePayoutCalendar(Date.parse('2026-12-31T16:59:59Z'))).toBe('31/12/2026');
    expect(affiliatePayoutCalendar(Date.parse('2026-12-31T17:00:00Z'))).toBe('31/01/2027');
  });
  it('uses the actual last day, including leap years', () => {
    expect(affiliatePayoutCalendar(Date.parse('2028-02-10T00:00:00Z'))).toBe('29/02/2028');
    expect(affiliatePayoutCalendar(Date.parse('2026-02-10T00:00:00Z'))).toBe('28/02/2026');
  });
});
