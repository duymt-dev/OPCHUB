import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import { adminDatePresets, datePickerFormat } from './date-picker';

describe('D-141 AC824-08/09 Gregorian picker presentation', () => {
  it.each([
    ['vi', '21/11/2026'],
    ['en', '21/11/2026'],
    ['en-SG', '21/11/2026'],
    ['zh', '2026/11/21'],
    ['id', '21/11/2026'],
    ['th', '21/11/2026'],
    ['ms', '21/11/2026'],
    ['ms-BN', '21/11/2026'],
    ['fil', '11/21/2026'],
    ['km', '21/11/2026'],
    ['lo', '21/11/2026'],
    ['my', '21/11/2026'],
  ])('%s display pattern leaves canonical date unchanged', (locale, display) => {
    const date = dayjs('2026-11-21');
    expect(date.format(datePickerFormat(locale))).toBe(display);
    expect(date.format('YYYY-MM-DD')).toBe('2026-11-21');
  });

  it('keeps live Vietnam preset days across 17:00Z, year/month boundaries and leap February', () => {
    let instant = new Date('2026-12-31T16:59:59.000Z');
    const presets = adminDatePresets(['today', 'week', '30', 'month', 'previous'], () => instant);
    const dates = (index: number) =>
      presets[index]?.value().map((date) => date.format('YYYY-MM-DD'));
    expect(dates(0)).toEqual(['2026-12-31', '2026-12-31']);
    instant = new Date('2026-12-31T17:00:00.000Z');
    expect(dates(0)).toEqual(['2027-01-01', '2027-01-01']);
    expect(dates(1)).toEqual(['2026-12-26', '2027-01-01']);
    expect(dates(2)).toEqual(['2026-12-03', '2027-01-01']);
    expect(dates(3)).toEqual(['2027-01-01', '2027-01-31']);
    expect(dates(4)).toEqual(['2026-12-01', '2026-12-31']);
    instant = new Date('2028-03-01T00:00:00.000Z');
    expect(dates(4)).toEqual(['2028-02-01', '2028-02-29']);
  });
});
