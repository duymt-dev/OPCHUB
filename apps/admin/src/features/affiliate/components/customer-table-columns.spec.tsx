import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { AdminTable } from '@opchub/ui';
import type { AffiliateCustomer } from '../types';
import { affiliateTestContext, setupAffiliateBrowser } from '../tests/context';
import { useCustomerColumns } from './customer-table-columns';

beforeAll(setupAffiliateBrowser);
afterEach(cleanup);

function CustomerTable({ year, rate }: { year: number; rate: number }) {
  const row: AffiliateCustomer = {
    id: 'snapshot',
    name: 'Customer snapshot',
    plan: 'Gói Cá nhân',
    date: '2026-11-06T00:00:00Z',
    feeAmount: 1200000,
    commission: 300000,
    rate,
    customerYear: year,
    source: 'membership',
    status: 'recorded',
    cancelReason: null,
    paidAt: null,
    bank: null,
  };
  return <AdminTable rowKey="id" data={[row]} columns={useCustomerColumns()} pagination={false} />;
}

describe('TIP-V46-812 customer rate retains actual snapshot year', () => {
  it.each([
    [1, 25, '25% · Năm 1'],
    [2, 10, '10% · Năm 2 · gia hạn'],
    [4, 7, '7% · Năm 4 · gia hạn'],
  ] as const)(
    'renders year%i without inferring an expiry or recalculating its rate',
    (year, rate, label) => {
      render(<CustomerTable year={year} rate={rate} />, affiliateTestContext());
      expect(screen.getByRole('cell', { name: label })).toBeTruthy();
    },
  );
});
