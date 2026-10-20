import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { affiliateTestContext } from '../tests/context';
import { AffiliateDetailTabs } from './affiliate-detail-tabs';

afterEach(cleanup);

describe('REQ-312 detail tabs retain prototype copy and the API customer count', () => {
  it('does not turn an unavailable history total into a misleading zero', () => {
    render(
      <AffiliateDetailTabs tab="months" customers={undefined} update={vi.fn()} />,
      affiliateTestContext(),
    );
    expect(screen.getByRole('tab', { name: /^Khách hàng của đại lý$/ })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: /^Khách hàng của đại lý 0$/ })).toBeNull();
  });
  it('displays the supplied total, not the length of the current customer page', () => {
    render(
      <AffiliateDetailTabs tab="months" customers={73} update={vi.fn()} />,
      affiliateTestContext(),
    );
    expect(screen.getByRole('tab', { name: /^Khách hàng của đại lý 73$/ })).toBeTruthy();
    expect(
      screen
        .getByRole('tab', { name: /^Đối soát & chi trả theo tháng$/ })
        .getAttribute('aria-selected'),
    ).toBe('true');
  });

  it('retains zero and resets the URL page when changing tabs', () => {
    const update = vi.fn();
    render(
      <AffiliateDetailTabs tab="months" customers={0} update={update} />,
      affiliateTestContext(),
    );
    fireEvent.click(screen.getByRole('tab', { name: /^Khách hàng của đại lý 0$/ }));
    expect(update).toHaveBeenCalledExactlyOnceWith({ tab: 'customers', page: 1 });
  });
});
