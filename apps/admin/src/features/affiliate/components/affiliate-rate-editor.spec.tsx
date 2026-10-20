import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { useGrants } from '@/lib/permissions';
import * as api from '../api';
import { affiliateTestContext, setupAffiliateBrowser } from '../tests/context';
import { AffiliateRateEditor } from './affiliate-rate-editor';

vi.mock('@/lib/permissions', () => ({ useGrants: vi.fn() }));
vi.mock('../api', async (original) => ({
  ...(await original<typeof api>()),
  setAffiliateRate: vi.fn(),
}));
beforeAll(setupAffiliateBrowser);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useGrants).mockReturnValue({
    keys: ['affiliate.view', 'affiliate.action'],
    roleName: 'Any name',
    previewing: false,
  });
  vi.mocked(api.setAffiliateRate).mockResolvedValue({ updated: 1 });
});
afterEach(cleanup);

const open = () => fireEvent.click(screen.getByRole('button', { name: /^Sửa \(Admin\)$/ }));
const input = () =>
  screen.getByRole<HTMLInputElement>('spinbutton', { name: /^Tỷ lệ hoa hồng \(%\)$/ });
const form = () => screen.getByRole('form', { name: /^Đặt tỷ lệ hoa hồng$/ });

describe('REQ-308 REQ-312 individual rate editing follows the inline ver2 interaction', () => {
  it('cancels without a write and opens again from the latest server-owned rate', () => {
    const view = render(<AffiliateRateEditor id="a3" rate={25} />, affiliateTestContext());
    open();
    expect(input().value).toBe('25');
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.change(input(), { target: { value: '31' } });
    fireEvent.click(screen.getByRole('button', { name: /^Hủy$/ }));
    expect(screen.queryByRole('form')).toBeNull();
    expect(api.setAffiliateRate).not.toHaveBeenCalled();
    view.rerender(<AffiliateRateEditor id="a3" rate={29} />);
    open();
    expect(input().value).toBe('29');
  });

  it('rejects an empty draft and submits a valid integer through the individual endpoint', async () => {
    render(<AffiliateRateEditor id="a3" rate={25} />, affiliateTestContext());
    open();
    fireEvent.change(input(), { target: { value: '' } });
    expect(screen.getByRole('button', { name: /^Lưu$/ }).hasAttribute('disabled')).toBe(true);
    fireEvent.submit(form());
    expect(api.setAffiliateRate).not.toHaveBeenCalled();
    fireEvent.change(input(), { target: { value: '31' } });
    fireEvent.submit(form());
    await waitFor(() => expect(screen.queryByRole('form')).toBeNull());
    expect(api.setAffiliateRate).toHaveBeenCalledExactlyOnceWith('a3', 31);
  });

  it('keeps the draft on conflict and retries without inventing a success', async () => {
    vi.mocked(api.setAffiliateRate).mockRejectedValueOnce(
      new ApiError('CONFLICT', 409, 'Xung đột tỷ lệ'),
    );
    render(<AffiliateRateEditor id="a3" rate={25} />, affiliateTestContext());
    open();
    fireEvent.change(input(), { target: { value: '31' } });
    fireEvent.submit(form());
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Xung đột tỷ lệ'));
    expect(input().value).toBe('31');
    fireEvent.submit(form());
    await waitFor(() => expect(screen.queryByRole('form')).toBeNull());
    expect(api.setAffiliateRate).toHaveBeenCalledTimes(2);
    expect(api.setAffiliateRate).toHaveBeenLastCalledWith('a3', 31);
  });

  it('does not open for view-only permission', () => {
    vi.mocked(useGrants).mockReturnValue({
      keys: ['affiliate.view'],
      roleName: 'Viewer',
      previewing: false,
    });
    render(<AffiliateRateEditor id="a3" rate={25} />, affiliateTestContext());
    open();
    expect(screen.queryByRole('form')).toBeNull();
    expect(api.setAffiliateRate).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toContain('chỉ có quyền xem');
  });

  it('rechecks permission when the grant changes after opening', async () => {
    const view = render(<AffiliateRateEditor id="a3" rate={25} />, affiliateTestContext());
    open();
    fireEvent.change(input(), { target: { value: '31' } });
    vi.mocked(useGrants).mockReturnValue({
      keys: ['affiliate.view'],
      roleName: 'Viewer',
      previewing: false,
    });
    view.rerender(<AffiliateRateEditor id="a3" rate={25} />);
    fireEvent.submit(form());
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('chỉ có quyền xem'),
    );
    expect(input().value).toBe('31');
    expect(api.setAffiliateRate).not.toHaveBeenCalled();
  });

  it('locks draft/cancel while saving and closes only after the response', async () => {
    let complete: (value: { updated: number }) => void = () => undefined;
    vi.mocked(api.setAffiliateRate).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    render(<AffiliateRateEditor id="a3" rate={25} />, affiliateTestContext());
    open();
    fireEvent.change(input(), { target: { value: '31' } });
    fireEvent.submit(form());
    await waitFor(() => expect(input().disabled).toBe(true));
    expect(screen.getByRole('button', { name: /^Hủy$/ }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /^Hủy$/ }));
    expect(screen.getByRole('form')).toBeTruthy();
    await act(async () => {
      complete({ updated: 1 });
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.queryByRole('form')).toBeNull());
  });
});
