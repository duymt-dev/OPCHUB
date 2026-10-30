import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCan } from '@/lib/permissions';
import { fetchRevenueRetained, revenueKeys } from '../revenue-sharing-api';
import type * as RevenueApi from '../revenue-sharing-api';
import { affiliateTestContext, setupAffiliateBrowser } from '../tests/context';
import { AffiliateRetainedTotal } from './affiliate-retained-total';

vi.mock('@/lib/permissions', () => ({ useCan: vi.fn() }));
vi.mock('../revenue-sharing-api', async (original) => ({
  ...(await original<typeof RevenueApi>()),
  fetchRevenueRetained: vi.fn(),
}));
beforeEach(() => {
  vi.clearAllMocks();
  setupAffiliateBrowser();
  vi.mocked(useCan).mockReturnValue(true);
});
afterEach(cleanup);
const label = 'Doanh thu Media Soft giữ lại (sau phần GĐ Vùng)';

describe('REQ-617 outer retained header', () => {
  it('shows loading rather than a false zero while the request is unresolved', () => {
    vi.mocked(fetchRevenueRetained).mockReturnValue(new Promise(() => undefined));
    render(<AffiliateRetainedTotal />, affiliateTestContext());
    expect(screen.getByRole('status', { name: label }).getAttribute('aria-busy')).toBe('true');
    expect(screen.getByRole('status').textContent).toContain('—');
    expect(screen.getByRole('status').textContent).not.toContain('0đ');
  });
  it('renders attributed exact VND beyond Number precision, not the all-receipt total', async () => {
    vi.mocked(fetchRevenueRetained).mockResolvedValue({
      allReceipts: '9007199254741993',
      affiliateAttributed: '9007199254740993',
    });
    render(<AffiliateRetainedTotal />, affiliateTestContext());
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('9.007.199.254.740.993đ'),
    );
    expect(screen.getByRole('status').textContent).not.toContain('9.007.199.254.741.993đ');
  });
  it('does not request totals without affiliate.view', () => {
    vi.mocked(useCan).mockReturnValue(false);
    render(<AffiliateRetainedTotal />, affiliateTestContext());
    expect(fetchRevenueRetained).not.toHaveBeenCalled();
    expect(useCan).toHaveBeenCalledWith('affiliate.view');
    expect(screen.getByRole('status').textContent).not.toContain('0đ');
  });
  it('hides stale success on refresh failure and offers retry without fabricating zero', async () => {
    const context = affiliateTestContext();
    context.client.setQueryData(revenueKeys.retained, {
      allReceipts: '20',
      affiliateAttributed: '10',
    });
    vi.mocked(fetchRevenueRetained).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({
      allReceipts: '0',
      affiliateAttributed: '0',
    });
    render(<AffiliateRetainedTotal />, context);
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('Không tải được dữ liệu'),
    );
    expect(screen.getByRole('status').textContent).not.toContain('10đ');
    expect(screen.getByRole('status').textContent).not.toContain('0đ');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('0đ'));
    expect(screen.getByRole('status').textContent).not.toContain('Không tải được dữ liệu');
  });
  it('refreshes through existing revenue mutation invalidation and on remount', async () => {
    const context = affiliateTestContext();
    const fetch = vi.mocked(fetchRevenueRetained);
    fetch.mockResolvedValue({ allReceipts: '20', affiliateAttributed: '10' });
    const view = render(<AffiliateRetainedTotal />, context);
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('10đ'));
    fetch.mockResolvedValue({ allReceipts: '30', affiliateAttributed: '11' });
    await act(() => context.client.invalidateQueries({ queryKey: revenueKeys.all }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('11đ'));
    view.unmount();
    fetch.mockResolvedValue({ allReceipts: '40', affiliateAttributed: '12' });
    render(<AffiliateRetainedTotal />, context);
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('12đ'));
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
