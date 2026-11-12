import { act, cleanup, renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { afterEach, expect, it } from 'vitest';
import { numberText } from './number-text';
import { useNumberText } from './use-number-text';
import { intlLocaleOf } from './locales';

afterEach(cleanup);
it.each(['vi', 'en', 'zh', 'id', 'ms', 'th', 'fil', 'km', 'lo', 'my', 'en-SG', 'ms-BN'])(
  'D-141 AC824-08 formats scalar grouping/native digits for %s without changing the value',
  (locale) => {
    const value = 12345.123456789;
    expect(numberText(value, locale)).toBe(
      new Intl.NumberFormat(intlLocaleOf(locale), {
        maximumSignificantDigits: 21,
      }).format(value),
    );
    expect(value).toBe(12345.123456789);
  },
);
it('D-141 AC824-08 retains raw scalar precision, tiny numbers, negatives and original zero semantics', () => {
  const precise = 123.12345678912345;
  expect(numberText(precise, 'en')).toBe(String(precise));
  expect(numberText(1e-28, 'en')).toBe('0.' + '0'.repeat(27) + '1');
  expect(numberText(-12345.6789, 'en')).toBe('-12,345.6789');
  expect(numberText(-0, 'en')).toBe('0');
  expect(numberText(0, 'vi')).toBe('0');
  expect(numberText(null, 'vi')).toBe('—');
  expect(numberText(undefined, 'en')).toBe('—');
  expect(numberText(NaN, 'en')).toBe('—');
  expect(numberText(Infinity, 'en')).toBe('—');
});
it('D-141 AC824-10/11 changes only display strings, retains the numeric draft and callback value', () => {
  const current = { locale: 'vi' };
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale={current.locale} messages={{}} timeZone="Asia/Ho_Chi_Minh">
        {children}
      </NextIntlClientProvider>
    );
  }
  const h = renderHook(
    () => {
      const [draft, setDraft] = useState(1234.1234567);
      const display = useNumberText();
      return {
        draft,
        setDraft,
        text: display(draft),
        save: (callback: (value: number) => void) => callback(draft),
      };
    },
    { wrapper: Wrapper },
  );
  expect(h.result.current.text).toBe('1.234,1234567');
  act(() => h.result.current.setDraft(12345.678901));
  current.locale = 'en';
  h.rerender();
  expect(h.result.current.text).toBe('12,345.678901');
  expect(h.result.current.draft).toBe(12345.678901);
  h.result.current.save((value) => expect(value).toBe(12345.678901));
});
