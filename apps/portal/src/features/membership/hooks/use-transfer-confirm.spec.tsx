import type { MyMembership } from '@opchub/shared/api-domains';
import { mockLogin } from '@opchub/shared/mock-data';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import membership from '../../../../messages/vi/membership.json';
import { confirmTransfer, fetchMembership, membershipKeys } from '../api';
import { usePaywallStore } from '../store';
import { useTransferConfirm } from './use-membership';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@opchub/ui', () => ({ useToast: () => toast }));
vi.mock('@/lib/socket', () => ({ realtimeEnabled: true }));
vi.mock('../api', () => ({
  membershipKeys: { mine: ['me', 'membership'] },
  confirmTransfer: vi.fn(),
  fetchMembership: vi.fn(),
}));
let client: QueryClient;
const fee = (status: MyMembership['status'], validUntil: string | null): MyMembership => ({
  status,
  validUntil,
  amount: 1200000,
  memberCode: 'TV000001',
  transferRef: 'OPCHUB TV000001',
  transferContent: 'OPCHUB TV000001',
  neverPaid: false,
  qr: '',
  bank: { bankName: 'Bank', bankFullName: 'Bank', accountNo: '123', accountName: 'OPCHUB' },
});
function setFee(value: MyMembership) {
  client.setQueryData(membershipKeys.mine, value);
  const login = mockLogin('an.nguyen@mediasoft.vn', 'User@2026');
  if (!login.ok) throw new Error('Missing member fixture');
  useAuthStore.getState().setSession('test-only', { ...login.me, membershipFee: value });
}
function Wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="vi" messages={{ membership }}>
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: 0 } },
  });
  usePaywallStore.getState().reset();
  vi.mocked(confirmTransfer).mockResolvedValue({
    status: 'pending_payment',
    awaitingWebhook: true,
  });
});
afterEach(() => {
  cleanup();
  client.clear();
  useAuthStore.getState().clear();
  usePaywallStore.getState().reset();
});

it.each([null, '2026-01-01T00:00:00Z', '2099-01-01T00:00:00Z'])(
  'REQ-616 director cannot confirm transfer with preserved expiry %s',
  (until) => {
    setFee(fee('regional_director', until));
    const done = vi.fn();
    const { result } = renderHook(() => useTransferConfirm(done), { wrapper: Wrapper });
    act(() => result.current.confirm());
    expect(confirmTransfer).not.toHaveBeenCalled();
    expect(usePaywallStore.getState().waiting).toBe(false);
    expect(toast).not.toHaveBeenCalled();
    expect(done).not.toHaveBeenCalled();
  },
);

it('REQ-616 appointment during waiting cannot become a false received-payment toast or overwrite exemption', () => {
  setFee(fee('pending_payment', null));
  usePaywallStore.getState().startWait(null);
  const done = vi.fn();
  const { result } = renderHook(() => useTransferConfirm(done), { wrapper: Wrapper });
  act(() => setFee(fee('regional_director', '2026-01-01T00:00:00Z')));
  expect(result.current.waiting).toBe(false);
  expect(toast).not.toHaveBeenCalled();
  expect(done).not.toHaveBeenCalled();
  expect(useAuthStore.getState().me?.membershipFee?.status).toBe('regional_director');
});

it('REQ-616 session exemption blocks confirmation while the first membership read is unresolved', () => {
  setFee(fee('regional_director', null));
  client.removeQueries({ queryKey: membershipKeys.mine });
  vi.mocked(fetchMembership).mockReturnValue(new Promise(() => undefined));
  const { result } = renderHook(() => useTransferConfirm(vi.fn()), { wrapper: Wrapper });
  act(() => result.current.confirm());
  expect(confirmTransfer).not.toHaveBeenCalled();
  expect(usePaywallStore.getState().waiting).toBe(false);
  expect(toast).not.toHaveBeenCalled();
});

it('ordinary webhook activation still ends waiting, updates session and reports the received payment once', async () => {
  setFee(fee('pending_payment', null));
  const done = vi.fn();
  const { result } = renderHook(() => useTransferConfirm(done), { wrapper: Wrapper });
  act(() => result.current.confirm());
  await waitFor(() => expect(confirmTransfer).toHaveBeenCalledTimes(1));
  expect(usePaywallStore.getState().waiting).toBe(true);
  act(() => {
    client.setQueryData(membershipKeys.mine, fee('active', '2099-01-01T00:00:00Z'));
  });
  await waitFor(() => expect(done).toHaveBeenCalledTimes(1));
  expect(toast).toHaveBeenCalledTimes(1);
  expect(useAuthStore.getState().me?.membershipFee?.status).toBe('active');
  expect(usePaywallStore.getState().waiting).toBe(false);
});
