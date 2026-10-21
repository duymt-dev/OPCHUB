import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { mockLogin } from '@opchub/shared/mock-data';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { usePaidAccessRecovery } from './use-paid-access-recovery';

let qc: QueryClient;
const member = (id = 'm1', status: 'active' | 'pending_payment' = 'pending_payment') => {
  const login = mockLogin('an.nguyen@mediasoft.vn', 'User@2026');
  if (!login.ok || !login.me.membershipFee) throw new Error('Missing fixture');
  return { ...login.me, id, membershipFee: { ...login.me.membershipFee, status } };
};
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useAuthStore.getState().setSession('mock.m1', member());
});
afterEach(() => {
  qc.clear();
  useAuthStore.getState().clear();
});
const denied = new ApiError('MEMBERSHIP_REQUIRED', 402, 'Unpaid');

it('UAT-09 REQ-402 refetches active membership-denied reads on same-member activation', async () => {
  const read = vi.fn().mockRejectedValueOnce(denied).mockResolvedValue('accessible');
  const observer = new QueryObserver(qc, { queryKey: ['groups'], queryFn: read });
  const unsubscribe = observer.subscribe(() => undefined);
  await waitFor(() => expect(qc.getQueryState(['groups'])?.status).toBe('error'));
  const view = renderHook(() => usePaidAccessRecovery(qc));
  act(() => useAuthStore.getState().setSession('mock.m1', member('m1', 'active')));
  await waitFor(() => expect(qc.getQueryData(['groups'])).toBe('accessible'));
  expect(read).toHaveBeenCalledTimes(2);
  view.unmount();
  unsubscribe();
});

it('REQ-402 marks inactive denied data stale without refetching successful or unrelated errors', async () => {
  await qc
    .fetchQuery({ queryKey: ['denied'], queryFn: () => Promise.reject(denied) })
    .catch(() => undefined);
  await qc
    .fetchQuery({ queryKey: ['offline'], queryFn: () => Promise.reject(new Error('Offline')) })
    .catch(() => undefined);
  qc.setQueryData(['messages'], ['existing history']);
  const offlineBefore = qc.getQueryState(['offline']);
  const historyBefore = qc.getQueryState(['messages']);
  const invalidate = vi.spyOn(qc, 'invalidateQueries');
  const view = renderHook(() => usePaidAccessRecovery(qc));
  act(() => useAuthStore.getState().setSession('mock.m1', member('m1', 'active')));
  expect(qc.getQueryState(['denied'])?.isInvalidated).toBe(true);
  expect(qc.getQueryState(['offline'])).toEqual(offlineBefore);
  expect(qc.getQueryState(['messages'])).toEqual(historyBefore);
  const predicate = invalidate.mock.calls[0]?.[0]?.predicate;
  if (!predicate) throw new Error('Missing targeted predicate');
  for (const query of qc.getQueryCache().getAll())
    expect(predicate(query)).toBe(query.queryKey[0] === 'denied');
  view.unmount();
});

it('REQ-402 ignores initial paid login, user switches, renewal and updates after cleanup', () => {
  const invalidate = vi.spyOn(qc, 'invalidateQueries');
  useAuthStore.getState().setSession('mock.m1', member('m1', 'active'));
  const view = renderHook(() => usePaidAccessRecovery(qc));
  act(() => useAuthStore.getState().setSession('mock.m1', member('m1', 'active')));
  act(() => useAuthStore.getState().setSession('mock.m2', member('m2', 'active')));
  act(() => useAuthStore.getState().clear());
  act(() => useAuthStore.getState().setSession('mock.m1', member()));
  view.unmount();
  useAuthStore.getState().setSession('mock.m1', member('m1', 'active'));
  expect(invalidate).not.toHaveBeenCalled();
});
