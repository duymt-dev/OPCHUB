import { describe, expect, it } from 'vitest';
import { dashboardThreadClock } from './thread-clock';

describe('UAT-15 Dashboard fixture calendar independence', () => {
  it.each([
    ['2026-10-21T00:00:00Z', '2026-10-22T05:00:00Z'],
    ['2026-10-21T23:59:59Z', '2026-10-22T05:00:00Z'],
    ['2026-12-31T23:59:59Z', '2027-01-01T05:00:00Z'],
    ['2028-02-29T12:00:00Z', '2028-03-01T05:00:00Z'],
  ])(
    'places fixture roots after current demo time %s without entering the inactive-hour control',
    (input, expected) => {
      const reference = new Date(input);
      const result = dashboardThreadClock(reference);
      expect(result.toISOString()).toBe(new Date(expected).toISOString());
      expect(result.getTime()).toBeGreaterThan(reference.getTime());
      expect(result.getUTCHours() + 7).toBe(12);
      expect(reference.toISOString()).toBe(new Date(input).toISOString());
    },
  );
});
