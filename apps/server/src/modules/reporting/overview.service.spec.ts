import { describe, expect, it } from 'vitest';
import { deltaPct, lastMonths, lastWeeks, lastYears } from './overview.service';

describe('OverviewService intervals and calculation', () => {
  it('lastMonths: 7 months VN old -> new', () => {
    const m = lastMonths(new Date('2026-02-10T20:00:00Z')); // 03:00 11/02 VN
    expect(m.map((x) => x.label)).toEqual(['T8', 'T9', 'T10', 'T11', 'T12', 'T1', 'T2']);
    expect(m[0]?.day).toBe('2025-08-31');
    expect(m[6]?.day).toBe('2026-02-11');
    expect(m[6]?.key).toBe('2026-02');
  });

  it('lastWeeks: 7 weeks VN with W labels', () => {
    const w = lastWeeks(new Date('2026-11-09T08:00:00Z'));
    expect(w).toHaveLength(7);
    expect(w[0]?.label).toMatch(/^W\d+$/);
    expect(w[6]?.label).toMatch(/^W\d+$/);
    expect(w[6]?.key).toMatch(/^\d{4}-W\d{2}$/);
  });

  it('lastYears: 7 years up to current year', () => {
    const y = lastYears(new Date('2026-11-09T08:00:00Z'));
    expect(y).toHaveLength(7);
    expect(y.map((x) => x.label)).toEqual(['2020', '2021', '2022', '2023', '2024', '2025', '2026']);
    expect(y[6]?.day).toBe('2026-11-09');
    expect(y[0]?.day).toBe('2020-12-31');
  });

  it('deltaPct: safe on 0, accurate to 1 decimal place', () => {
    expect(deltaPct(0, 0)).toBe(0);
    expect(deltaPct(10, 0)).toBe(0);
    expect(deltaPct(100, 10)).toBe(11.1); // 10 / (100 - 10) = 11.1%
  });
});
