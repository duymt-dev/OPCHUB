import type { MembershipFeeStatus } from '@opchub/shared';
import { mockLogin } from '@opchub/shared/mock-data';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useAuthStore } from '@/lib/auth-store';
import membership from '../../../../messages/vi/membership.json';
import { PlanBadge } from './plan-badge';

const state = vi.hoisted(() => {
  const initial: { status: MembershipFeeStatus; until: string | null } = {
    status: 'regional_director',
    until: null,
  };
  return { ...initial, open: vi.fn<() => void>() };
});
vi.mock('../hooks/use-membership', () => ({
  useMembership: () => ({
    data: { validUntil: state.until },
    status: state.status,
    now: Date.parse('2026-10-30T00:00:00Z'),
  }),
}));
vi.mock('../navigation', () => ({
  openPricingPopup: () => {
    state.open();
  },
}));

function show() {
  return render(
    <NextIntlClientProvider locale="vi" messages={{ membership }}>
      <PlanBadge />
    </NextIntlClientProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  state.status = 'regional_director';
  const login = mockLogin('an.nguyen@mediasoft.vn', 'User@2026');
  if (!login.ok) throw new Error('Missing member fixture');
  useAuthStore.getState().setSession('test-only', login.me);
});
afterEach(() => {
  cleanup();
  useAuthStore.getState().clear();
});

it.each([null, '2026-01-01T00:00:00Z', '2026-11-01T00:00:00Z', '2027-12-01T00:00:00Z'])(
  'REQ-616 director badge never counts down preserved term %s, keeps pricing accessible',
  (until) => {
    state.until = until;
    show();
    expect(screen.getByRole('region', { name: membership.badge.title }).dataset.exempt).toBe('1');
    expect(screen.getByText('Miễn phí · GĐ Vùng')).toBeTruthy();
    expect(screen.getByText(membership.badge.duringTenure)).toBeTruthy();
    expect(screen.queryByText(membership.badge.until)).toBeNull();
    expect(screen.queryByText(/Còn \d+ ngày/)).toBeNull();
    expect(screen.queryByRole('button', { name: membership.badge.pay })).toBeNull();
    expect(screen.queryByRole('button', { name: membership.badge.renew })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: membership.badge.pricing }));
    expect(state.open).toHaveBeenCalledTimes(1);
  },
);

it('REQ-616 revocation replaces exemption with ordinary unpaid controls', () => {
  state.until = null;
  const view = show();
  state.status = 'pending_payment';
  view.rerender(
    <NextIntlClientProvider locale="vi" messages={{ membership }}>
      <PlanBadge />
    </NextIntlClientProvider>,
  );
  expect(screen.queryByText('Miễn phí · GĐ Vùng')).toBeNull();
  expect(screen.getByRole('region', { name: membership.badge.title }).dataset.exempt).toBe('0');
  fireEvent.click(screen.getByRole('button', { name: membership.badge.pay }));
  expect(state.open).toHaveBeenCalledTimes(1);
});

it('ordinary expiring membership retains its deadline and renewal control', () => {
  state.status = 'expiring';
  state.until = '2026-11-01T00:00:00Z';
  show();
  expect(screen.getByText(membership.badge.until)).toBeTruthy();
  expect(screen.getByRole('button', { name: membership.badge.renew })).toBeTruthy();
  expect(screen.queryByText('Miễn phí · GĐ Vùng')).toBeNull();
});
