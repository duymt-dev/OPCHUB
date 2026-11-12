import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDate, formatNumber, formatPercentPoints } from './format';

describe('D-141 AC824-08 presentation formatting', () => {
  it('formats counts by locale without changing values', () => {
    expect(formatNumber(1234, 'vi')).toBe('1.234');
    expect(formatNumber(1234, 'en')).toBe('1,234');
    expect(formatNumber(-1234, 'en')).toBe('-1,234');
    expect(formatNumber(0, 'en')).toBe('0');
    expect(formatNumber(1234.5, 'en')).toBe('1,234.5');
    expect(formatNumber(Number.MAX_SAFE_INTEGER, 'en')).toBe('9,007,199,254,740,991');
  });

  it.each([null, undefined, Number.NaN, Number.POSITIVE_INFINITY])(
    'keeps absent/invalid %s empty',
    (v) => {
      expect(formatNumber(v, 'en')).toBe('—');
      expect(formatCurrency(v, 'VND', 'en')).toBe('—');
      expect(formatPercentPoints(v, 'en')).toBe('—');
    },
  );

  it('retains VND, USD and raw percent semantics without exchange or business rounding', () => {
    expect(formatCurrency(1234, 'VND', 'vi')).toBe('1.234đ');
    expect(formatCurrency(1234, 'VND', 'en')).toContain('1,234');
    expect(formatCurrency(1234, 'VND', 'en')).not.toContain('.00');
    expect(formatCurrency(1234.5, 'USD', 'en')).toContain('1,234.50');
    expect(formatPercentPoints(33, 'en')).toBe('33%');
    expect(formatPercentPoints(0, 'en')).toBe('0%');
    expect(formatPercentPoints(-2.5, 'en')).toBe('-2.5%');
    expect(formatPercentPoints(12.345678, 'en', 20)).toBe('12.345678%');
    expect(formatPercentPoints(33.33333333, 'en', 20)).toBe('33.33333333%');
    expect(formatPercentPoints(0.000001, 'en', 20)).toBe('0.000001%');
  });

  it('fixes Vietnam midnight, year boundary and Gregorian year even in Thai', () => {
    expect(formatDate('2026-12-31T16:59:59Z', 'en')).toBe('31/12/2026');
    expect(formatDate('2026-12-31T17:00:00Z', 'en')).toBe('01/01/2027');
    expect(formatDate('2026-12-31T17:00:00Z', 'th')).toContain('2027');
    expect(formatDate('2026-12-31T17:00:00Z', 'th')).not.toContain('2570');
    expect(formatDate('2026-01-01', 'en')).toBe('01/01/2026');
    expect(formatDate('2024-02-29', 'en')).toBe('29/02/2024');
  });

  it.each([null, undefined, '', 'bad', '2026-02-30', '2026-02-29', '2026-10-16T09:00:00'])(
    'does not parse ambiguous or invalid date %s',
    (value) => expect(formatDate(value, 'en')).toBe('—'),
  );

  it('does not mutate Date instances or allow callers to change the business timezone/calendar', () => {
    const date = new Date('2026-12-31T17:00:00Z');
    expect(formatDate(date, 'en', { year: 'numeric', timeZone: 'UTC', calendar: 'buddhist' })).toBe(
      '2027',
    );
    expect(date.toISOString()).toBe('2026-12-31T17:00:00.000Z');
    expect(formatDate(new Date(Number.NaN), 'en')).toBe('—');
  });
});
