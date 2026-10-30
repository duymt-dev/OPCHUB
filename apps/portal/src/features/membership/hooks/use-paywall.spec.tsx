import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import auth from '../../../../messages/vi/auth.json';
import membership from '../../../../messages/vi/membership.json';
import { pushPath } from '../navigation';
import { usePaywallStore } from '../store';
import { usePaywall } from './use-paywall';

const state = vi.hoisted(() => ({
  path: '/membership/pay',
  exempt: true,
  mandatory: false,
  router: { replace: vi.fn() },
}));
vi.mock('next/navigation', () => ({
  usePathname: () => state.path,
  useRouter: () => state.router,
}));
vi.mock('./use-membership', () => ({
  useMembership: () => ({ exempt: state.exempt, mandatory: state.mandatory }),
}));
vi.mock('../navigation', () => ({ pushPath: vi.fn() }));
vi.mock('@opchub/ui', () => ({ useToast: () => vi.fn() }));
vi.mock('@/features/auth', () => ({ logout: vi.fn() }));
let client: QueryClient;
function Wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="vi" messages={{ auth, membership }}>
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  state.path = '/membership/pay';
  state.exempt = true;
  state.mandatory = false;
  client = new QueryClient();
  usePaywallStore.getState().reset();
});
afterEach(() => {
  cleanup();
  client.clear();
  usePaywallStore.getState().reset();
});

it('REQ-616 direct pay URL never renders transfer view for a director, clears waiting and replaces URL', () => {
  usePaywallStore.getState().startWait('2026-01-01T00:00:00Z');
  const { result } = renderHook(usePaywall, { wrapper: Wrapper });
  expect(result.current.view).toBe('list');
  expect(result.current.mandatory).toBe(false);
  expect(usePaywallStore.getState().waiting).toBe(false);
  expect(state.router.replace).toHaveBeenCalledWith('/services', { scroll: false });
});

it('REQ-616 appointment during transfer hides payment immediately without manufacturing activation', () => {
  state.exempt = false;
  const { result, rerender } = renderHook(usePaywall, { wrapper: Wrapper });
  expect(result.current.view).toBe('pay');
  act(() => usePaywallStore.getState().startWait(null));
  state.exempt = true;
  rerender();
  expect(result.current.view).toBe('list');
  expect(usePaywallStore.getState().waiting).toBe(false);
  expect(state.router.replace).toHaveBeenCalledTimes(1);
});

it('REQ-616 guards programmatic payment but retains consultations and explicit pricing', () => {
  state.path = '/services';
  const { result } = renderHook(usePaywall, { wrapper: Wrapper });
  act(() => result.current.toPay(true));
  expect(pushPath).not.toHaveBeenCalled();
  expect(result.current.view).toBe('list');
  act(() => result.current.toForm('svc-1'));
  expect(pushPath).toHaveBeenCalledWith('/services/svc-1/request');
  expect(state.router.replace).not.toHaveBeenCalled();
});

it('ordinary pending membership retains mandatory overlay and payment navigation', () => {
  state.exempt = false;
  state.mandatory = true;
  state.path = '/dashboard';
  const { result } = renderHook(usePaywall, { wrapper: Wrapper });
  expect(result.current.mandatory).toBe(true);
  expect(result.current.view).toBe('list');
  act(() => result.current.toPay(true));
  expect(pushPath).toHaveBeenCalledWith('/membership/pay');
  expect(state.router.replace).not.toHaveBeenCalled();
});
