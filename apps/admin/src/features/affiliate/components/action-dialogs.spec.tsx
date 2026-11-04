import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { useGrants } from '@/lib/permissions';
import * as api from '../api';
import { affiliateTestContext, setupAffiliateBrowser } from '../tests/context';
import { CancelDialog } from './cancel-dialog';
import { RateDialog } from './rate-dialog';

vi.mock('@/lib/permissions', () => ({ useGrants: vi.fn() }));
vi.mock('../api', async (original) => ({
  ...(await original<typeof api>()),
  cancelCommissions: vi.fn(),
  setAffiliateRate: vi.fn(),
  setAffiliateRates: vi.fn(),
}));
beforeAll(setupAffiliateBrowser);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useGrants).mockReturnValue({
    keys: ['affiliate.view', 'affiliate.action', 'affiliate.payout'],
    roleName: 'Any name',
    previewing: false,
  });
  vi.mocked(api.cancelCommissions).mockResolvedValue({ cancelled: 2 });
  vi.mocked(api.setAffiliateRate).mockResolvedValue({ updated: 1 });
});
afterEach(cleanup);

describe('REQ-308 REQ-309 REQ-310 Affiliate financial dialogs', () => {
  it('requires a nonblank cancellation reason before enabling confirmation', async () => {
    const onClose = vi.fn();
    render(<CancelDialog ids={['c1', 'c2']} onClose={onClose} />, affiliateTestContext());
    const confirm = screen.getByRole('button', { name: 'Xác nhận' });
    expect(confirm.hasAttribute('disabled')).toBe(true);
    fireEvent.change(screen.getByLabelText('Lý do hủy'), { target: { value: '   ' } });
    expect(confirm.hasAttribute('disabled')).toBe(true);
    fireEvent.change(screen.getByLabelText('Lý do hủy'), {
      target: { value: '  Vi phạm điều khoản  ' },
    });
    fireEvent.click(confirm);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(api.cancelCommissions).toHaveBeenCalledWith(['c1', 'c2'], 'Vi phạm điều khoản');
  });
  it('does not close the cancel dialog on backend conflict or manufacture a success', async () => {
    vi.mocked(api.cancelCommissions).mockRejectedValueOnce(
      new ApiError('CONFLICT', 409, 'Không còn khoản hợp lệ'),
    );
    const onClose = vi.fn();
    render(<CancelDialog ids={['c1']} onClose={onClose} />, affiliateTestContext());
    fireEvent.change(screen.getByLabelText('Lý do hủy'), { target: { value: 'Lý do' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }));
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('Không còn khoản hợp lệ'),
    );
    expect(onClose).not.toHaveBeenCalled();
  });
  it('disables an empty rate and submits a valid individual rate through PATCH', async () => {
    const onClose = vi.fn();
    render(<RateDialog ids={['a1']} initialRate={25} onClose={onClose} />, affiliateTestContext());
    fireEvent.change(screen.getByLabelText('Tỷ lệ hoa hồng (%)'), { target: { value: '' } });
    expect(screen.getByRole('button', { name: /^Lưu$/ }).hasAttribute('disabled')).toBe(true);
    fireEvent.change(screen.getByLabelText('Tỷ lệ hoa hồng (%)'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: /^Lưu$/ }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(api.setAffiliateRate).toHaveBeenCalledWith('a1', 30);
  });
});
