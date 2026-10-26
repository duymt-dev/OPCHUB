import { ToastProvider } from '@opchub/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import affiliate from '../../../../messages/vi/affiliate.json';
import { useAuthStore } from '@/lib/auth-store';
import { ShareBar } from './share-bar';

const fetchSpy = vi.fn<typeof fetch>();

const link = 'https://opchub.community/r/HAOPC';
const write = vi.fn<(text: string) => Promise<void>>();
let previous: PropertyDescriptor | undefined;
beforeEach(() => {
  previous = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: write },
  });
  write.mockReset().mockResolvedValue(undefined);
  fetchSpy.mockReset().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', fetchSpy);
  useAuthStore.setState({
    accessToken: 't',
    me: {
      id: `u-${crypto.randomUUID()}`,
      fullName: 'Hà',
      email: 'ha@opchub.vn',
      accountType: 'personal',
      systemRole: 'member',
      status: 'active',
      avatarUrl: null,
      needsDeclaration: false,
      membershipFee: null,
    },
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  useAuthStore.setState({ accessToken: null, me: null });
  if (previous) Object.defineProperty(navigator, 'clipboard', previous);
  else Reflect.deleteProperty(navigator, 'clipboard');
});
function show() {
  render(
    <NextIntlClientProvider locale="vi" messages={{ affiliate }}>
      <QueryClientProvider client={new QueryClient()}>
        <ToastProvider>
          <ShareBar link={link} code="HAOPC" />
        </ToastProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

describe('Affiliate copy actions', () => {
  it('REQ-311 localized action names exclude decorative icon labels; copies exact link/code with toast', async () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: /^Sao chép$/ }));
    await waitFor(() => expect(write).toHaveBeenLastCalledWith(link));
    expect(await screen.findByText('Đã sao chép link giới thiệu')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /^Sao chép mã$/ }));
    await waitFor(() => expect(write).toHaveBeenLastCalledWith('HAOPC'));
    expect(await screen.findByText('Đã sao chép mã giới thiệu')).toBeDefined();
    // V4-611 (D-85): sao chép thành công → cờ "chia sẻ link" một lần (idempotent)
    const flags = fetchSpy.mock.calls.filter(
      ([u]) => typeof u === 'string' && u.endsWith('/me/onboarding/flags/affiliate_share'),
    );
    expect(flags).toHaveLength(1);
  });
  it('REQ-311 denied clipboard permission shows a failure rather than false success', async () => {
    write.mockRejectedValue(new Error('denied'));
    show();
    fireEvent.click(screen.getByRole('button', { name: /^Sao chép mã$/ }));
    expect(await screen.findByText(affiliate.share.failed)).toBeDefined();
    expect(screen.queryByText('Đã sao chép mã giới thiệu')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
