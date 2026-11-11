import { describe, expect, it, vi } from 'vitest';
import { prepareAdminIntl, adminDateFormatter, adminNumberFormatter } from './runtime';
import { formatCurrency, formatDate, formatNumber, formatPercentPoints } from '../format';
import fonts from '../font-assets.json';

const CASES = [
  ['lo', '1.234.567,89', '₫199.000', '31/12/2026', '01/01/2027'],
  ['km', '1,234,567.89', '199,000₫', '31/12/2026', '01/01/2027'],
  ['my', '၁,၂၃၄,၅၆၇.၈၉', '၁၉၉,၀၀၀\u00a0₫', '၃၁/၁၂/၂၀၂၆', '၀၁/၀၁/၂၀၂၇'],
] as const;

describe('D-141 AC824-08/09 prepared scoped CLDR, no native-locale fallback', () => {
  it.each(CASES)(
    '%s formats numbers, VND and Vietnam Gregorian year boundary with actual data',
    async (locale, count, money, before, after) => {
      const nativeDate = Intl.DateTimeFormat;
      const nativeNumber = Intl.NumberFormat;
      await prepareAdminIntl(locale);
      expect(formatNumber(1234567.89, locale)).toBe(count);
      expect(formatCurrency(199000, 'VND', locale)).toBe(money);
      expect(formatDate('2026-12-31T16:59:59Z', locale)).toBe(before);
      expect(formatDate('2026-12-31T17:00:00Z', locale)).toBe(after);
      expect(formatDate('2026-02-30', locale)).toBe('—');
      expect(formatNumber(null, locale)).toBe('—');
      expect(formatPercentPoints(null, locale)).toBe('—');
      expect(Intl.DateTimeFormat).toBe(nativeDate);
      expect(Intl.NumberFormat).toBe(nativeNumber);
      expect(prepareAdminIntl(locale)).toBeUndefined();
    },
  );

  it('does not share a selected default across concurrent locale preparation or change raw Date/number values', async () => {
    vi.resetModules();
    const cold = await import('./runtime');
    const display = await import('../format');
    const work = ['lo', 'km', 'my'].map(cold.prepareAdminIntl);
    expect(work.every((ready) => ready instanceof Promise)).toBe(true);
    await Promise.all(work.map((ready) => Promise.resolve(ready)));
    const date = new Date('2028-02-29T05:00:00Z');
    const timestamp = date.getTime();
    expect(display.formatDate(date, 'lo')).toBe('29/02/2028');
    expect(display.formatDate(date, 'km')).toBe('29/02/2028');
    expect(display.formatDate(date, 'my')).toBe('၂၉/၀၂/၂၀၂၈');
    expect(date.getTime()).toBe(timestamp);
    expect(formatNumber(-1234.5, 'lo')).toBe('-1.234,5');
    expect(formatNumber(0, 'my')).toBe('၀');
    expect(formatPercentPoints(33, 'my')).toBe('၃၃%');
    expect(formatNumber(1234, 'my', { numberingSystem: 'latn' })).toBe('1,234');
    expect(formatNumber(12.5, 'lo', { minimumIntegerDigits: undefined })).toBe('12,5');
    expect(formatDate(date, 'lo', { year: 'numeric', calendar: 'buddhist', timeZone: 'UTC' })).toBe(
      '2028',
    );
  });

  it.each([
    'vi',
    'en',
    'en-SG',
    'zh',
    'id',
    'th',
    'ms',
    'ms-BN',
    'fil',
    '',
    '../lo',
    'constructor',
  ])('never prepares a scoped dataset for native or invalid selector %s', (locale) =>
    expect(prepareAdminIntl(locale)).toBeUndefined(),
  );

  it('retains native constructors for other identities and pins explicit prepared timezone/calendar', async () => {
    await prepareAdminIntl('lo');
    expect(adminNumberFormatter('en')).toBeInstanceOf(Intl.NumberFormat);
    expect(adminDateFormatter('vi')).toBeInstanceOf(Intl.DateTimeFormat);
    const options = adminDateFormatter('lo', {
      timeZone: 'Asia/Ho_Chi_Minh',
      calendar: 'gregory',
    }).resolvedOptions();
    expect(options.locale).toBe('lo-LA');
    expect(options.timeZone).toBe('Asia/Ho_Chi_Minh');
    expect(options.calendar).toBe('gregory');
  });

  it('uses actual historical Vietnam offsets and calendar boundaries, not a fixed +07 approximation', async () => {
    await prepareAdminIntl('lo');
    expect(
      formatDate('1900-01-01T00:00:00Z', 'lo', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      }),
    ).toBe('07:06:30');
    expect(formatDate('2028-02-28T16:59:59Z', 'lo')).toBe('28/02/2028');
    expect(formatDate('2028-02-28T17:00:00Z', 'lo')).toBe('29/02/2028');
    expect(
      formatDate('2026-12-31T17:00:00Z', 'lo', {
        year: 'numeric',
        calendar: 'buddhist',
        timeZone: 'UTC',
      }),
    ).toBe('2027');
  });

  it.each([
    ['lo', 'NotoSansLao', /\p{Script=Lao}/u],
    ['km', 'NotoSansKhmer', /\p{Script=Khmer}/u],
    ['my', 'NotoSansMyanmar', /\p{Script=Myanmar}/u],
  ] as const)(
    '%s month/weekday names and numeric/currency output use selected script and existing font glyphs',
    async (locale, family, script) => {
      await prepareAdminIntl(locale);
      const dates = Array.from({ length: 12 }, (_, month) => {
        const text = formatDate(new Date(Date.UTC(2028, month, 9, 5)), locale, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        });
        expect(text).toMatch(script);
        return text;
      });
      const ranges = [fonts.assets.NotoSans.cmap, fonts.assets[family].cmap]
        .flatMap((cmap) => cmap.split(','))
        .map((range) => range.split('-').map((value) => parseInt(value, 16)));
      const text =
        dates.join('') +
        formatNumber(-12345.67, locale) +
        formatCurrency(199000, 'VND', locale) +
        formatCurrency(12.5, 'USD', locale);
      for (const char of new Set(text)) {
        if (!/[\p{L}\p{M}\p{N}\p{P}\p{Sc}]/u.test(char)) continue;
        const point = char.codePointAt(0) ?? -1;
        expect(
          ranges.some(([start = -1, end = -1]) => point >= start && point <= end),
          `${locale}:${char}`,
        ).toBe(true);
      }
    },
  );

  it('shares one preparation promise but keeps a failed load rejected, never retrying/falling back per render', async () => {
    vi.resetModules();
    const successful = await import('./runtime');
    const first = successful.prepareAdminIntl('lo');
    expect(successful.prepareAdminIntl('lo')).toBe(first);
    await first;
    expect(successful.prepareAdminIntl('lo')).toBeUndefined();
    vi.resetModules();
    const loader = vi.fn(() => Promise.reject(new Error('Expected load failure fixture')));
    vi.doMock('./data-loaders', () => ({ dataLoaders: { lo: loader } }));
    try {
      const failed = await import('./runtime');
      const rejected = failed.prepareAdminIntl('lo');
      await expect(rejected).rejects.toMatchObject({
        name: 'AdminIntlResourceError',
        locale: 'lo',
      });
      await expect(rejected).rejects.toHaveProperty(
        'cause.message',
        'Expected load failure fixture',
      );
      expect(failed.prepareAdminIntl('lo')).toBe(rejected);
      expect(loader).toHaveBeenCalledTimes(1);
      failed.resetFailedAdminIntl('lo');
      const retry = failed.prepareAdminIntl('lo');
      expect(retry).not.toBe(rejected);
      await expect(retry).rejects.toBeInstanceOf(Error);
      expect(loader).toHaveBeenCalledTimes(2);
      expect(failed.prepareAdminIntl('en')).toBeUndefined();
    } finally {
      vi.doUnmock('./data-loaders');
      vi.resetModules();
    }
  });
});
