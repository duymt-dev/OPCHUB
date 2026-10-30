import type { MembershipFeeStatus } from '@opchub/shared';
import { mockLogin } from '@opchub/shared/mock-data';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type * as Membership from '@/features/membership';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import profile from '../../../../messages/vi/profile.json';
import { BillingTab } from './billing-tab';

vi.mock('@/lib/api-client', () => ({ api: vi.fn() }));
vi.mock('@/lib/use-prices', () => ({ usePrices: () => null }));
vi.mock('@/features/membership', async (importOriginal) => {
  const membership = await importOriginal<typeof Membership>();
  return {
    formatDate: membership.formatDate,
    formatVnd: membership.formatVnd,
    openPricingPopup: vi.fn(),
  };
});
let client: QueryClient;
function session(status: MembershipFeeStatus, validUntil: string | null) {
  const login = mockLogin('an.nguyen@mediasoft.vn', 'User@2026');
  if (!login.ok || !login.me.membershipFee) throw new Error('Missing member fee fixture');
  useAuthStore.getState().setSession('test-only', {
    ...login.me,
    membershipFee: { ...login.me.membershipFee, status, validUntil },
  });
}
function show() {
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="vi" timeZone="Asia/Ho_Chi_Minh" messages={{ profile }}>
        <BillingTab />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  vi.mocked(api).mockResolvedValue({ items: [] });
});
afterEach(() => {
  cleanup();
  client.clear();
  useAuthStore.getState().clear();
  vi.clearAllMocks();
});

it.each([null, '2026-01-01T00:00:00Z', '2099-01-01T00:00:00Z'])(
  'REQ-616 billing shows tenure exemption, not original deadline %s',
  async (until) => {
    session('regional_director', until);
    show();
    expect(screen.getByText('Miễn phí · GĐ Vùng')).toBeTruthy();
    expect(screen.getByText(profile.pay.duringTenure)).toBeTruthy();
    expect(screen.queryByText(/Hiệu lực đến/)).toBeNull();
    expect(screen.queryByRole('button', { name: profile.pay.pay })).toBeNull();
    await waitFor(() => expect(screen.getByText(profile.pay.noRows)).toBeTruthy());
    // Presentation must not destroy the BR-462 restoration snapshot in the session.
    expect(useAuthStore.getState().me?.membershipFee?.validUntil).toBe(until);
  },
);

it('REQ-616 revocation immediately restores unpaid presentation from membership.updated session', async () => {
  session('regional_director', null);
  show();
  act(() => session('pending_payment', null));
  expect(screen.queryByText('Miễn phí · GĐ Vùng')).toBeNull();
  expect(screen.getByText(profile.pay.payToActivate)).toBeTruthy();
  expect(screen.getByRole('button', { name: profile.pay.pay })).toBeTruthy();
  await waitFor(() => expect(screen.getByText(profile.pay.noRows)).toBeTruthy());
});

it('REQ-616 exemption never waives the separate fundraising fee or hides payment history', async () => {
  session('regional_director', null);
  client.setQueryData(
    ['me', 'fundraisings'],
    [
      {
        id: 'fund1',
        projectName: 'Dự án A',
        code: 'GV000001',
        amount: 15000000,
        createdAt: '2026-10-01T00:00:00Z',
        endsAt: null,
        status: 'pending_payment',
      },
    ],
  );
  client.setQueryData(
    ['me', 'membership', 'periods'],
    [
      {
        id: 'period1',
        amount: 3600000,
        paidAt: '2026-01-01T00:00:00Z',
      },
    ],
  );
  // Keep seeded query responses stable while the mounted screen refetches.
  vi.mocked(api).mockImplementation((path) =>
    Promise.resolve({
      items: client.getQueryData(
        path === '/me/fundraisings' ? ['me', 'fundraisings'] : ['me', 'membership', 'periods'],
      ),
    }),
  );
  show();
  expect(screen.getByText('15.000.000đ')).toBeTruthy();
  expect(screen.getByText(profile.pay.st_pending_payment)).toBeTruthy();
  expect(screen.getByText('3.600.000đ')).toBeTruthy();
  expect(screen.getByText(profile.pay.paid)).toBeTruthy();
  await waitFor(() => expect(api).toHaveBeenCalledTimes(2));
});
