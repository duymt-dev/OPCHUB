import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { mockLogin } from '@opchub/shared/mock-data';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/lib/auth-store';
import { fetchMembership, membershipKeys } from '../api';
import { useMockMembershipPush } from './use-mock-membership-push';

const bridge = vi.hoisted(() => ({
  subscribe: vi.fn<(id: string, listener: () => void) => () => void>(),
  unsubscribe: vi.fn(),
}));
vi.mock('@opchub/shared/mock-affiliate-browser', () => ({
  subscribeMockMembership: bridge.subscribe,
}));
vi.mock('../api', () => ({
  membershipKeys: { mine: ['me', 'membership'] },
  fetchMembership: vi.fn(),
}));
const fee = {
  status: 'active' as const,
  validUntil: '2027-10-21T08:00:00Z',
  transferRef: 'OPCHUB TV000001',
  amount: 600000,
  memberCode: 'TV000001',
  bank: { bankName: 'Bank', accountNo: '123', accountName: 'OPC', bankFullName: 'Bank' },
  transferContent: 'OPCHUB TV000001',
  neverPaid: false,
  qr: '',
};
let qc: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  bridge.subscribe.mockReturnValue(bridge.unsubscribe);
  const login = mockLogin('an.nguyen@mediasoft.vn', 'User@2026');
  if (!login.ok) throw new Error('Missing fixture');
  useAuthStore.getState().setSession('mock.m1', login.me);
  vi.mocked(fetchMembership).mockResolvedValue(fee);
});
afterEach(() => {
  qc.clear();
  useAuthStore.getState().clear();
});

it('AT-LK02 reloads authenticated membership and updates session only for its user', async () => {
  const view = renderHook(() => useMockMembershipPush(qc, true));
  await waitFor(() => expect(bridge.subscribe).toHaveBeenCalledTimes(1));
  expect(bridge.subscribe.mock.calls[0]?.[0]).toBe('m1');
  act(() => bridge.subscribe.mock.calls[0]?.[1]());
  await waitFor(() => expect(useAuthStore.getState().me?.membershipFee).toEqual(fee));
  expect(qc.getQueryData(membershipKeys.mine)).toEqual(fee);
  view.unmount();
  expect(bridge.unsubscribe).toHaveBeenCalledTimes(1);
});

it('AT-LK02 leaves native transport untouched and cleans late subscriptions', async () => {
  const native = renderHook(() => useMockMembershipPush(qc, false));
  native.unmount();
  const late = renderHook(() => useMockMembershipPush(qc, true));
  late.unmount();
  await act(async () => {
    await Promise.resolve();
  });
  expect(bridge.subscribe).not.toHaveBeenCalled();
  expect(fetchMembership).not.toHaveBeenCalled();
});

it('AT-LK02 a failed read cannot grant membership', async () => {
  vi.mocked(fetchMembership).mockRejectedValue(new Error('Unavailable'));
  const before = useAuthStore.getState().me;
  const view = renderHook(() => useMockMembershipPush(qc, true));
  await waitFor(() => expect(bridge.subscribe).toHaveBeenCalledTimes(1));
  act(() => bridge.subscribe.mock.calls[0]?.[1]());
  await waitFor(() => expect(qc.getQueryState(membershipKeys.mine)?.status).toBe('error'));
  expect(useAuthStore.getState().me).toEqual(before);
  view.unmount();
});
