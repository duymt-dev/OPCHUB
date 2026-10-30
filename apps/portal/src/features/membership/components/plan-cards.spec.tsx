import { PRICE_DEFAULTS } from '@opchub/shared/fixtures';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import membership from '../../../../messages/vi/membership.json';
import { PlanCards } from './plan-cards';

afterEach(cleanup);

it.each(['personal', 'business'] as const)(
  'REQ-616 %s director keeps all pricing controls but cannot renew membership; fundraising remains paid',
  (mine) => {
    const join = vi.fn();
    const fund = vi.fn();
    render(
      <NextIntlClientProvider locale="vi" messages={{ membership }}>
        <PlanCards
          mine={mine}
          paid
          exempt
          onJoin={join}
          onFundraising={fund}
          prices={PRICE_DEFAULTS}
        />
      </NextIntlClientProvider>,
    );
    const free = screen.getByRole('button', { name: 'Miễn phí · GĐ Vùng' });
    expect(free.hasAttribute('disabled')).toBe(true);
    expect(screen.getAllByRole('button')).toHaveLength(3);
    fireEvent.click(free);
    expect(join).not.toHaveBeenCalled();
    expect(screen.getByText(membership.badge.duringTenure)).toBeTruthy();
    const payFund = screen.getByRole('button', { name: 'Đăng ký · 15.000.000đ/dự án' });
    expect(payFund.hasAttribute('disabled')).toBe(false);
    fireEvent.click(payFund);
    expect(fund).toHaveBeenCalledTimes(1);
  },
);

it.each([true, false])('ordinary membership keeps its join/renew control (paid=%s)', (paid) => {
  const join = vi.fn();
  render(
    <NextIntlClientProvider locale="vi" messages={{ membership }}>
      <PlanCards
        mine="personal"
        paid={paid}
        exempt={false}
        onJoin={join}
        onFundraising={vi.fn()}
        prices={PRICE_DEFAULTS}
      />
    </NextIntlClientProvider>,
  );
  fireEvent.click(
    screen.getByRole('button', {
      name: `${paid ? 'Gia hạn' : 'Đăng ký'} · 1.200.000đ/năm`,
    }),
  );
  expect(join).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: 'Miễn phí · GĐ Vùng' })).toBeNull();
});
