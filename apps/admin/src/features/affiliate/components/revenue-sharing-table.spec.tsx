import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { affiliateTestContext, setupAffiliateBrowser } from '../tests/context';
import { revenueFixture } from '../tests/revenue';
import { RevenueSharingTable } from './revenue-sharing-table';

beforeAll(setupAffiliateBrowser);
afterEach(cleanup);

describe('REQ-617 sharing empty-search feedback', () => {
  it('keeps a complete live empty message and the column headings without invented records', () => {
    render(
      <RevenueSharingTable rows={[]} onPay={vi.fn()} canPay={false} />,
      affiliateTestContext(),
    );
    expect(screen.getByRole('status').textContent).toBe('Không tìm thấy GĐ Vùng phù hợp.');
    expect(screen.getByRole('columnheader', { name: 'GĐ Vùng' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Bảo/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Chi trả' })).toBeNull();
  });

  it('replaces empty feedback with the actual returned rows when the filter clears', () => {
    const onPay = vi.fn();
    const view = render(
      <RevenueSharingTable rows={[]} onPay={onPay} canPay={false} />,
      affiliateTestContext(),
    );
    expect(screen.getByRole('status')).toBeTruthy();
    view.rerender(
      <RevenueSharingTable rows={revenueFixture().items} onPay={onPay} canPay={false} />,
    );
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('button', { name: /Bảo/ })).toBeTruthy();
    expect(screen.getByText('Chưa có GĐ Vùng')).toBeTruthy();
    expect(onPay).not.toHaveBeenCalled();
  });
});
