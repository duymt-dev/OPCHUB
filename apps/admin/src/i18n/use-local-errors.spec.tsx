import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useLocalErrors } from './use-local-errors';

afterEach(cleanup);
const translate = (locale: string) => (code: 'required' | 'invalid') => `${locale}:${code}`;

describe('D-141 AC824-10/12 typed local error provenance', () => {
  it('renders stored client codes in the current locale without resetting fields', () => {
    const h = renderHook(
      ({ locale }) => useLocalErrors<'password', 'required' | 'invalid'>(translate(locale)),
      { initialProps: { locale: 'vi' } },
    );
    act(() => h.result.current.local({ password: 'required' }));
    expect(h.result.current.errors.password).toBe('vi:required');
    h.rerender({ locale: 'en' });
    expect(h.result.current.errors.password).toBe('en:required');
    act(() => h.result.current.clear());
    h.rerender({ locale: 'zh' });
    expect(h.result.current.errors).toEqual({});
  });

  it('keeps API text raw even when identical to a known local code or translation', () => {
    const h = renderHook(
      ({ locale }) => useLocalErrors<'a' | 'b', 'required' | 'invalid'>(translate(locale)),
      { initialProps: { locale: 'vi' } },
    );
    act(() => h.result.current.raw({ a: 'required', b: 'vi:invalid' }));
    h.rerender({ locale: 'en' });
    expect(h.result.current.errors).toEqual({ a: 'required', b: 'vi:invalid' });
  });

  it('initial local link errors are live and a raw error replaces rather than merges them', () => {
    const h = renderHook(
      ({ locale }) =>
        useLocalErrors<'link', 'required' | 'invalid'>(translate(locale), {
          link: { kind: 'local', code: 'invalid' },
        }),
      { initialProps: { locale: 'vi' } },
    );
    h.rerender({ locale: 'en' });
    expect(h.result.current.errors.link).toBe('en:invalid');
    act(() => h.result.current.raw({ link: 'Server text' }));
    h.rerender({ locale: 'vi' });
    expect(h.result.current.errors.link).toBe('Server text');
  });
});
