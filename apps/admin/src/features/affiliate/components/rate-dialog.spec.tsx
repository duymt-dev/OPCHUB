import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { useGrants } from '@/lib/permissions';
import * as api from '../api';
import { affiliateTestContext, setupAffiliateBrowser } from '../tests/context';
import { RateDialog } from './rate-dialog';

vi.mock('@/lib/permissions', () => ({ useGrants: vi.fn() }));
vi.mock('../api', async (original) => ({
  ...(await original<typeof api>()),
  setAffiliateRates: vi.fn(),
  setAffiliateRate: vi.fn(),
}));
beforeAll(setupAffiliateBrowser);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useGrants).mockReturnValue({
    keys: ['affiliate.view', 'affiliate.action'],
    roleName: 'Test',
    previewing: false,
  });
  vi.mocked(api.setAffiliateRates).mockResolvedValue({ updated: 2 });
});
afterEach(cleanup);

const ids = ['a1', 'a2'];
const rate = () =>
  screen.getByRole<HTMLInputElement>('spinbutton', { name: /^Tỷ lệ hoa hồng \(%\)$/ });
const save = () => screen.getByRole('button', { name: /^Lưu$/ });

describe('REQ-308 REQ-312 bulk rate dialog preserves financial intent across failures', () => {
  it('retains the draft and both IDs on 409, retrying only through the bulk endpoint', async () => {
    vi.mocked(api.setAffiliateRates).mockRejectedValueOnce(
      new ApiError('CONFLICT', 409, 'Rate conflict'),
    );
    const onClose = vi.fn();
    render(<RateDialog ids={ids} onClose={onClose} />, affiliateTestContext());
    fireEvent.change(rate(), { target: { value: '30' } });
    fireEvent.click(save());
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Rate conflict'));
    expect(rate().value).toBe('30');
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(save());
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(vi.mocked(api.setAffiliateRates).mock.calls).toEqual([
      [ids, 30],
      [ids, 30],
    ]);
    expect(api.setAffiliateRate).not.toHaveBeenCalled();
  });

  it('rechecks revoked action permission before applying the retained draft', async () => {
    const onClose = vi.fn();
    const view = render(<RateDialog ids={ids} onClose={onClose} />, affiliateTestContext());
    fireEvent.change(rate(), { target: { value: '30' } });
    vi.mocked(useGrants).mockReturnValue({
      keys: ['affiliate.view'],
      roleName: 'Viewer',
      previewing: false,
    });
    view.rerender(<RateDialog ids={ids} onClose={onClose} />);
    fireEvent.click(save());
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('chỉ có quyền xem'),
    );
    expect(rate().value).toBe('30');
    expect(onClose).not.toHaveBeenCalled();
    expect(api.setAffiliateRates).not.toHaveBeenCalled();
    expect(api.setAffiliateRate).not.toHaveBeenCalled();
  });

  it('disables editing and dismissing while saving, then closes only after the response', async () => {
    let resolve: ((result: { updated: number }) => void) | undefined;
    const pending = new Promise<{ updated: number }>((done) => {
      resolve = done;
    });
    vi.mocked(api.setAffiliateRates).mockReturnValue(pending);
    const onClose = vi.fn();
    render(<RateDialog ids={ids} onClose={onClose} />, affiliateTestContext());
    fireEvent.click(save());
    await waitFor(() => expect(rate().disabled).toBe(true));
    const close = screen.getByRole('button', { name: /^Đóng$/ });
    expect(close.hasAttribute('disabled')).toBe(true);
    fireEvent.click(close);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => {
      resolve?.({ updated: 2 });
      await pending;
    });
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });
});
