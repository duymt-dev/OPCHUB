import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import type { AffiliateCodeResult } from '@opchub/shared/api-domains';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import auth from '../../../../messages/vi/auth.json';
import * as referralApi from '../referral-api';
import { useReferralCode } from './use-referral-code';

let search = '';
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(search) }));
let client: QueryClient;
const valid = (name: string): AffiliateCodeResult => ({
  valid: true,
  affiliateName: name,
  cookieDays: 30,
});
function Wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="vi" messages={{ auth }}>
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  search = '';
  document.cookie = 'opc_ref=; Max-Age=0; Path=/';
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.restoreAllMocks();
});

describe('useReferralCode (TIP-V2-403)', () => {
  it('REQ-303 debounce 400ms, prefill URL before cookie; manual override remains editable', async () => {
    search = 'ref=URLCODE';
    document.cookie = 'opc_ref=COOKIE; Path=/';
    const check = vi
      .spyOn(referralApi, 'checkReferralCode')
      .mockResolvedValue(valid('Nguyễn Văn An'));
    const edited = vi.fn();
    const { result } = renderHook(() => useReferralCode('', edited), { wrapper: Wrapper });
    expect(result.current.code).toBe('URLCODE');
    expect(check).not.toHaveBeenCalled();
    expect(result.current.pending).toBe(true);
    await waitFor(() => expect(result.current.affiliateName).toBe('Nguyễn Văn An'));
    act(() => result.current.setCode('new-_123'));
    expect(result.current.code).toBe('NEW123');
    expect(result.current.affiliateName).toBeUndefined();
    expect(result.current.pending).toBe(true);
    await waitFor(() => expect(check).toHaveBeenCalledWith('NEW123', ''));
    expect(edited).toHaveBeenCalledTimes(1);
  });

  it('AT-AF03 REQ-304 email changes invalidate valid result and show the self error', async () => {
    search = 'ref=OPCAN26';
    const message = 'Không thể dùng mã giới thiệu của chính bạn';
    vi.spyOn(referralApi, 'checkReferralCode').mockImplementation((_code, email) =>
      Promise.resolve(
        email === 'self@test.vn'
          ? { valid: false, reason: 'self', message }
          : valid('Nguyễn Văn An'),
      ),
    );
    const { result, rerender } = renderHook(
      ({ email }) => useReferralCode(email, () => undefined),
      {
        initialProps: { email: 'new@test.vn' },
        wrapper: Wrapper,
      },
    );
    await waitFor(() => expect(result.current.affiliateName).toBe('Nguyễn Văn An'));
    rerender({ email: 'SELF@test.vn' });
    expect(result.current.affiliateName).toBeUndefined();
    expect(result.current.pending).toBe(true);
    await waitFor(() => expect(result.current.error).toBe(message));
  });

  it('REQ-304 a late response for an old code never overwrites the new result', async () => {
    search = 'ref=OLD1';
    let resolveOld: (v: AffiliateCodeResult) => void = () => {
      throw new Error('Old request not started');
    };
    const check = vi.spyOn(referralApi, 'checkReferralCode').mockImplementation((code) =>
      code === 'OLD1'
        ? new Promise((resolve) => {
            resolveOld = resolve;
          })
        : Promise.resolve(valid('New owner')),
    );
    const { result } = renderHook(() => useReferralCode('', () => undefined), { wrapper: Wrapper });
    await waitFor(() => expect(check).toHaveBeenCalledWith('OLD1', ''));
    act(() => result.current.setCode('NEW2'));
    await waitFor(() => expect(result.current.affiliateName).toBe('New owner'));
    await act(async () => {
      resolveOld(valid('Old owner'));
      await Promise.resolve();
    });
    expect(result.current.affiliateName).toBe('New owner');
  });

  it('REQ-304 failed check blocks, empty optional code does not send a request or block', async () => {
    search = 'ref=OPCAN26';
    const check = vi
      .spyOn(referralApi, 'checkReferralCode')
      .mockRejectedValue(new Error('Network failure'));
    const { result } = renderHook(() => useReferralCode('', () => undefined), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.error).toBe(auth.register.referral.unavailable));
    act(() => result.current.setCode(''));
    expect(result.current.error).toBeUndefined();
    expect(result.current.pending).toBe(false);
    expect(check).toHaveBeenCalledTimes(1);
  });
});
