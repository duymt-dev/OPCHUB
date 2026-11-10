import { describe, expect, it } from 'vitest';
import { lastMonths, lastWeeks, lastYears, overviewRange, deltaPct } from './overview-intervals';

describe('REQ-122 VN intervals', () => {
  it('REQ-122 first ISO bucket includes previous December', () => {
    const weeks = lastWeeks(new Date('2026-02-12T08:00:00Z'));
    expect(weeks).toHaveLength(7);
    expect(weeks[0]).toEqual({
      start: '2025-12-29',
      day: '2026-01-04',
      label: 'W1',
      key: '2026-W01',
    });
    expect(weeks[6]).toEqual({
      start: '2026-02-09',
      day: '2026-02-12',
      label: 'W7',
      key: '2026-W07',
    });
  });
  it('REQ-122 seven months and five calendar years, across VN midnight', () => {
    const now = new Date('2025-12-31T17:01:00Z');
    expect(lastMonths(now).map((m) => m.key)).toEqual([
      '2025-07',
      '2025-08',
      '2025-09',
      '2025-10',
      '2025-11',
      '2025-12',
      '2026-01',
    ]);
    expect(lastYears(now).map((m) => m.key)).toEqual(['2022', '2023', '2024', '2025', '2026']);
    expect(lastWeeks(now).at(-1)?.key).toBe('2026-W01');
  });
  it('BUG-029 half-open VN defaults and leap day range', () => {
    const range = overviewRange(new Date('2026-10-31T17:00:00Z'));
    expect(range.from).toBe('2026-11-01');
    expect(range.to).toBe('2026-11-01');
    expect(range.start.toISOString()).toBe('2026-10-31T17:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-11-01T17:00:00.000Z');
    const leap = overviewRange(new Date(), {
      period: 'month',
      from: '2024-02-29',
      to: '2024-02-29',
    });
    expect(leap.end.getTime() - leap.start.getTime()).toBe(86_400_000);
    expect(deltaPct(100, 10)).toBe(11.1);
    expect(deltaPct(0, 0)).toBe(0);
    expect(deltaPct(10, 10)).toBe(0);
  });
});
