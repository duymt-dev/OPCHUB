import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { affiliateTestContext } from '../tests/context';
import { AffiliateStats } from './affiliate-stats';
import { CommissionStatus } from './commission-status';
import { MonthStatus } from './month-status';

afterEach(cleanup);
describe('REQ-312 Affiliate Admin presentation', () => {
  it('labels a recorded monthly balance unpaid without relabeling individual commissions', () => {
    render(
      <>
        <MonthStatus status="recorded" />
        <CommissionStatus status="recorded" />
      </>,
      affiliateTestContext(),
    );
    expect(screen.getByText('Chưa chi trả')).toBeTruthy();
    expect(screen.getByText('Đã ghi nhận')).toBeTruthy();
  });
  it('renders server-owned paid, not net revenue or a subtraction inferred in the client', () => {
    render(
      <AffiliateStats
        summary={{
          revenue: 999001,
          totalCommission: 1234,
          payable: 33,
          paid: 777,
          netRevenue: 123,
        }}
      />,
      affiliateTestContext(),
    );
    const paid = screen.getByText('Đã chi trả').parentElement;
    expect(paid).not.toBeNull();
    expect(within(paid!).getByText('777đ')).toBeTruthy();
    expect(screen.getByText('999.001đ')).toBeTruthy();
    expect(screen.queryByText('123đ')).toBeNull();
  });
  it('does not present unavailable totals as zero', () => {
    render(<AffiliateStats summary={undefined} />, affiliateTestContext());
    expect(screen.getAllByText('—')).toHaveLength(4);
    expect(screen.queryByText('0đ')).toBeNull();
  });
  it('REQ-310 exposes the cancellation reason without encoding status only as color', () => {
    render(
      <CommissionStatus status="cancelled" reason="Đăng ký vi phạm" />,
      affiliateTestContext(),
    );
    expect(screen.getByLabelText('Đã hủy: Đăng ký vi phạm')).toBeTruthy();
    expect(screen.getByText('Đã hủy')).toBeTruthy();
  });
  it('renders a neutral dash for the backend no-commission month state', () => {
    render(<CommissionStatus status="none" />, affiliateTestContext());
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.queryByText('none')).toBeNull();
  });
});
