import dayjs from 'dayjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { datePickerFormat } from './date-picker';

const CASES = [
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
] as const;

afterEach(() => vi.restoreAllMocks());

describe('D-141 AC824-08/09 reduced-ICU numeric picker, not general Intl formatters', () => {
  it.each(CASES)(
    '%s preserves approved display order when Intl cannot supply locale data',
    (locale, expected) => {
      const intl = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
        throw new Error('Numeric picker must not depend on optional browser ICU');
      });
      const date = dayjs('2026-11-21');
      expect(date.format(datePickerFormat(locale))).toBe(expected);
      expect(date.format('YYYY-MM-DD')).toBe('2026-11-21');
      expect(intl).not.toHaveBeenCalled();
    },
  );

  it.each(['', '../lo', 'lo/../../fil', 'constructor', 'unknown'])(
    'fails closed to Vietnamese numeric order for invalid locale %s',
    (locale) => expect(dayjs('2026-11-21').format(datePickerFormat(locale))).toBe('21/11/2026'),
  );
});
