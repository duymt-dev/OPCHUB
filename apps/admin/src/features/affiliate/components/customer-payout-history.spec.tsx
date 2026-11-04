import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { AffiliateCustomer } from '../types';
import { affiliateTestContext } from '../tests/context';
import { CustomerPayoutHistory } from './customer-payout-history';

afterEach(cleanup);
const paid: AffiliateCustomer = {
  customerYear: 1,
  source: 'membership',
  id: 'history-1',
  name: 'Khách demo',
  plan: 'Thành viên hệ thống',
  date: '2026-09-24T17:00:00.000Z',
  feeAmount: 600000,
  rate: 25,
  commission: 120001,
  status: 'paid',
  cancelReason: null,
  paidAt: '2026-09-30T10:00:00.000Z',
  bank: { bankHolder: 'LE THU HA', bankName: 'ACB', bankNo: '24681357' },
};

describe('REQ-309 REQ-410 customer payout history preserves backend receipt values', () => {
  it('shows the supplied amount/date and immutable bank, without deriving money from fee/rate', () => {
    render(<CustomerPayoutHistory row={paid} />, affiliateTestContext());
    expect(screen.getByText('120.001đ')).toBeTruthy();
    expect(screen.getByText(/30\/9\/2026/)).toBeTruthy();
    expect(screen.getByText(/LE THU HA · ACB · 2468 1357 · kỳ Tháng 09\/2026/)).toBeTruthy();
    expect(screen.queryByText('150.000đ')).toBeNull();
  });

  it('keeps a missing historical bank unknown instead of substituting a live bank', () => {
    render(<CustomerPayoutHistory row={{ ...paid, bank: null }} />, affiliateTestContext());
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.getByText('120.001đ')).toBeTruthy();
    expect(screen.getByText(/30\/9\/2026/)).toBeTruthy();
    expect(screen.queryByText(/ACB/)).toBeNull();
  });

  it('labels an unpaid month in Vietnam time across the UTC boundary', () => {
    render(
      <CustomerPayoutHistory
        row={{
          ...paid,
          status: 'recorded',
          paidAt: null,
          bank: null,
          date: '2026-09-30T18:00:00.000Z',
        }}
      />,
      affiliateTestContext(),
    );
    expect(screen.getByText('Chưa chi trả — sẽ thanh toán cuối 10/2026.')).toBeTruthy();
    expect(screen.queryByText(/ACB/)).toBeNull();
  });

  it('keeps cancelled history explicit and does not imply it will be paid', () => {
    render(
      <CustomerPayoutHistory row={{ ...paid, status: 'cancelled', paidAt: null, bank: null }} />,
      affiliateTestContext(),
    );
    expect(screen.getByText('Hoa hồng đã hủy — không chi trả.')).toBeTruthy();
    expect(screen.queryByText(/sẽ thanh toán/)).toBeNull();
  });
});
