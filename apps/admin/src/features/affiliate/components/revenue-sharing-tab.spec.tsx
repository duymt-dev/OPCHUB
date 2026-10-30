import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGrants } from '@/lib/permissions';
import { ApiError } from '@/lib/api-client';
import * as api from '../revenue-sharing-api';
import { affiliateTestContext, setupAffiliateBrowser } from '../tests/context';
import {
  revenueFixture,
  revenueLedgerFixture,
  revenueReceiptFixture,
  revenueMonthFixture,
} from '../tests/revenue';
import { RevenueSharingTab } from './revenue-sharing-tab';

vi.mock('@/lib/permissions', () => ({ useGrants: vi.fn() }));
vi.mock('../revenue-sharing-api', async (original) => ({
  ...(await original<typeof api>()),
  fetchRevenueDashboard: vi.fn(),
  fetchRevenueLedger: vi.fn(),
  fetchRevenueHistory: vi.fn(),
  fetchRevenueMonths: vi.fn(),
  fetchFormerRevenueDirectors: vi.fn(),
  payDirectorRevenue: vi.fn(),
}));
beforeAll(setupAffiliateBrowser);
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-10-15T05:00:00Z').getTime());
  vi.mocked(useGrants).mockReturnValue({
    keys: ['affiliate.view', 'affiliate.payout'],
    roleName: 'Any role',
    previewing: false,
  });
  vi.mocked(api.fetchRevenueDashboard).mockImplementation((q) =>
    Promise.resolve(revenueFixture(q)),
  );
  vi.mocked(api.fetchRevenueLedger).mockResolvedValue({
    items: [revenueLedgerFixture],
    nextCursor: null,
  });
  vi.mocked(api.fetchRevenueHistory).mockResolvedValue({ items: [], nextCursor: null });
  vi.mocked(api.fetchRevenueMonths).mockResolvedValue({
    items: revenueMonthFixture,
    nextCursor: null,
  });
  vi.mocked(api.fetchFormerRevenueDirectors).mockResolvedValue({ items: [], nextCursor: null });
  vi.mocked(api.payDirectorRevenue).mockResolvedValue(revenueReceiptFixture);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const show = () => render(<RevenueSharingTab query="" onQuery={vi.fn()} />, affiliateTestContext());
const ready = () => screen.findByRole('button', { name: /Bảo/ });

describe('REQ-617 GĐ Vùng Admin tab', () => {
  it('REQ-617 shared search keeps a responsive draft and debounces the URL filter', async () => {
    const onQuery = vi.fn();
    render(<RevenueSharingTab query="" onQuery={onQuery} />, affiliateTestContext());
    await ready();
    const search = screen.getByRole('searchbox', { name: 'Tìm GĐ Vùng hoặc vùng...' });
    fireEvent.change(search, { target: { value: 'Miền' } });
    fireEvent.change(search, { target: { value: 'Miền Bắc' } });
    expect(onQuery).not.toHaveBeenCalled();
    await waitFor(() => expect(onQuery).toHaveBeenCalledExactlyOnceWith('Miền Bắc'));
  });
  it('renders server totals/policy and lazy ledger/history; readonly can inspect but cannot pay', async () => {
    vi.mocked(useGrants).mockReturnValue({
      keys: ['affiliate.view'],
      roleName: 'Whatever',
      previewing: false,
    });
    show();
    const director = await ready();
    expect(screen.getByText('3 khoản từ 1 affiliate')).toBeTruthy();
    expect(screen.getAllByText('Vietcombank · 0123 4567 89')).toHaveLength(2);
    expect(screen.getByText(/50% năm 1 · 40% năm 2 · 30% năm 3 · 20% từ năm 4/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Chi trả' }).hasAttribute('disabled')).toBe(true);
    expect(api.fetchRevenueLedger).not.toHaveBeenCalled();
    fireEvent.click(director);
    expect(await screen.findByText('Khách An')).toBeTruthy();
    expect(screen.getByText('50% · Năm 1')).toBeTruthy();
    expect(await screen.findByText('Chưa có lịch sử chi trả.')).toBeTruthy();
    expect(api.payDirectorRevenue).not.toHaveBeenCalled();
  });

  it('filters rows and due/paid on the server while keeping allocation global; vacant slot never has a bank', async () => {
    const context = affiliateTestContext();
    const view = render(<RevenueSharingTab query="" onQuery={vi.fn()} />, context);
    await ready();
    view.rerender(<RevenueSharingTab query="Miền Nam" onQuery={vi.fn()} />);
    await waitFor(() => expect(screen.queryByRole('button', { name: /Bảo/ })).toBeNull());
    expect(screen.getByText('Chưa có GĐ Vùng')).toBeTruthy();
    expect(screen.getByText('Chưa cập nhật tài khoản nhận')).toBeTruthy();
    expect(screen.getByText('3 khoản từ 1 affiliate')).toBeTruthy();
    expect(api.fetchRevenueDashboard).toHaveBeenLastCalledWith('Miền Nam');
    expect(screen.getByText('Phải chi cuối tháng').parentElement?.textContent).toContain('0đ');
  });

  it('shows retry on dashboard failure and makes no request without affiliate.view', async () => {
    vi.mocked(api.fetchRevenueDashboard).mockRejectedValueOnce(new Error('offline'));
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
    await ready();
    cleanup();
    vi.clearAllMocks();
    vi.mocked(useGrants).mockReturnValue({ keys: [], roleName: 'No access', previewing: false });
    show();
    expect(api.fetchRevenueDashboard).not.toHaveBeenCalled();
  });

  it('AT-GDV04 exposes retired beneficiaries lazily, without replacing current director identity', async () => {
    const row = revenueFixture().items[0]!;
    vi.mocked(api.fetchFormerRevenueDirectors).mockResolvedValue({
      items: [
        {
          ...row,
          id: 'retired',
          directorId: 'retired',
          name: 'Former recipient',
          current: false,
          provinces: [],
        },
      ],
      nextCursor: null,
    });
    show();
    await ready();
    expect(api.fetchFormerRevenueDirectors).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'GĐ Vùng đã thu hồi' }));
    expect(await screen.findByRole('button', { name: /Former recipient/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Bảo/ })).toBeTruthy();
  });

  it('REQ-617 excludes open months, confirms, keeps retry idempotency key and refetches after payout', async () => {
    vi.mocked(api.payDirectorRevenue)
      .mockRejectedValueOnce(new ApiError('INTERNAL', 500, 'Temporary payout error'))
      .mockResolvedValueOnce(revenueReceiptFixture);
    show();
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Chi trả' }));
    const dialog = await screen.findByRole('dialog');
    const pay = within(dialog).getByRole('button', { name: 'Chi trả' });
    expect(pay.hasAttribute('disabled')).toBe(true);
    const select = await within(dialog).findByRole('combobox', { name: 'Kỳ chi' });
    await waitFor(() => expect(api.fetchRevenueMonths).toHaveBeenCalled());
    fireEvent.mouseDown(select);
    const option = await screen.findByRole('option', { name: '09/2026 · 51đ' });
    expect(screen.queryByRole('option', { name: /10\/2026/ })).toBeNull();
    expect(option).toBeTruthy();
    fireEvent.keyDown(select, { key: 'Enter', code: 'Enter', keyCode: 13 });
    await waitFor(() => expect(pay.hasAttribute('disabled')).toBe(false));
    fireEvent.click(pay);
    await waitFor(() => expect(api.payDirectorRevenue).toHaveBeenCalledTimes(1));
    await screen.findByText('Temporary payout error');
    const first = vi.mocked(api.payDirectorRevenue).mock.calls[0]!;
    expect(first.slice(0, 2)).toEqual(['director-north', '2026-09']);
    await waitFor(() => expect(pay.hasAttribute('disabled')).toBe(false));
    fireEvent.click(pay);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(vi.mocked(api.payDirectorRevenue).mock.calls[1]).toEqual(first);
    expect(api.fetchRevenueDashboard).toHaveBeenCalledTimes(2);
  });
});
