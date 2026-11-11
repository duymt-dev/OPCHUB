import { describe, expect, it } from 'vitest';
import { compactMoney } from './compact-money';
import { intlLocaleOf } from './locales';

const LOCALES = ['vi', 'en', 'en-SG', 'zh', 'id', 'th', 'ms', 'ms-BN', 'fil', 'km', 'lo', 'my'];

describe('D-141 AC824-08 compact money retains currency and existing rounding', () => {
  it.each([
    [0, 'VND', '0 ₫'],
    [-1234, 'VND', '-1.234 ₫'],
    [999999, 'VND', '999.999 ₫'],
    [1000000, 'VND', '1 triệu ₫'],
    [1499999, 'VND', '1 triệu ₫'],
    [1500000, 'VND', '2 triệu ₫'],
    [1000000000, 'VND', '1 tỷ ₫'],
    [1150000000, 'VND', '1,1 tỷ ₫'], // Preserve JS toFixed, not a new Math.round formula.
    [1250000000, 'VND', '1,3 tỷ ₫'],
    [0, 'USD', '$0'],
    [-1234, 'USD', '$-1234'],
    [12.34, 'USD', '$12.34'],
    [999, 'USD', '$999'],
    [1499, 'USD', '$1K'],
    [1500, 'USD', '$2K'],
    [1000000, 'USD', '$1M'],
    [1150000, 'USD', '$1.1M'],
    [1250000, 'USD', '$1.3M'],
  ] as const)('keeps Vietnamese prototype output for %s %s', (amount, currency, expected) => {
    expect(compactMoney(amount, currency, 'vi')).toBe(expected);
  });

  it.each(LOCALES.filter((locale) => locale !== 'vi'))(
    'formats the same pre-rounded VND/USD amount in %s',
    (locale) => {
      for (const [value, currency, rounded] of [
        [1150000000, 'VND', 1100000000],
        [1250000000, 'VND', 1300000000],
        [1150000, 'USD', 1100000],
        [1250000, 'USD', 1300000],
      ] as const) {
        expect(compactMoney(value, currency, locale)).toBe(
          new Intl.NumberFormat(intlLocaleOf(locale), {
            style: 'currency',
            currency,
            notation: 'compact',
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
          }).format(rounded),
        );
      }
      expect(compactMoney(12.34, 'USD', locale)).toBe(
        new Intl.NumberFormat(intlLocaleOf(locale), {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 20,
        }).format(12.34),
      );
    },
  );

  it.each([null, undefined, NaN, Infinity, -Infinity])(
    'does not turn invalid %s into zero',
    (value) => {
      for (const locale of LOCALES) {
        expect(compactMoney(value, 'VND', locale)).toBe('—');
        expect(compactMoney(value, 'USD', locale)).toBe('—');
      }
    },
  );

  it('retains zero, negatives and large finite amounts without exchange', () => {
    expect(compactMoney(0, 'VND', 'en')).toBe('₫0');
    expect(compactMoney(-1234, 'USD', 'en')).toBe('-US$1,234');
    expect(compactMoney(150000, 'USD', 'en')).toBe('US$150k');
    expect(compactMoney(Number.MAX_SAFE_INTEGER, 'VND', 'en')).not.toContain('NaN');
    expect(compactMoney(1000000, 'VND', 'en')).not.toContain('US$');
  });
});
