import { afterEach, expect, it, vi } from 'vitest';
import { formatNumber } from './format';

const NativeNumberFormat = Intl.NumberFormat;
afterEach(() => vi.restoreAllMocks());

it('D-141 AC824-08 keeps Myanmar digits when the browser ICU falls back to en-US', () => {
  const constructor = vi
    .spyOn(Intl, 'NumberFormat')
    .mockImplementation(function (_locales, options) {
      return new NativeNumberFormat('en-US', options);
    });
  expect(formatNumber(1234, 'my')).toBe('၁,၂၃၄');
  expect(constructor).toHaveBeenLastCalledWith('my-MM', { numberingSystem: 'mymr' });
  expect(formatNumber(0, 'my')).toBe('၀');
  expect(formatNumber(-12, 'my')).toBe('-၁၂');
});

it('D-141 AC824-08 preserves explicit caller options and existing VI formatting', () => {
  expect(formatNumber(1234, 'vi')).toBe('1.234');
  expect(formatNumber(1234, 'my', { numberingSystem: 'latn' })).toBe('1,234');
  expect(formatNumber(1.25, 'my', { minimumFractionDigits: 2 })).toBe('၁.၂၅');
  expect(formatNumber(null, 'my')).toBe('—');
});
