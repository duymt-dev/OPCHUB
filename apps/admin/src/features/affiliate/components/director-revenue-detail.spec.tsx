import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGrants } from '@/lib/permissions';
import * as api from '../revenue-sharing-api';
import { affiliateTestContext, setupAffiliateBrowser } from '../tests/context';
import { revenueLedgerFixture, revenueReceiptFixture } from '../tests/revenue';
import { DirectorRevenueDetail } from './director-revenue-detail';

vi.mock('@/lib/permissions', () => ({ useGrants: vi.fn() }));
vi.mock('../revenue-sharing-api', async (original) => ({
  ...(await original<typeof api>()),
  fetchRevenueLedger: vi.fn(),
  fetchRevenueHistory: vi.fn(),
}));
const cursor = { at: revenueLedgerFixture.receivedAt, id: revenueLedgerFixture.id };
const second = { ...revenueLedgerFixture, id: 'second', customerName: 'Khách Bình' };
const ledger = () => screen.getByRole('region', { name: 'Khoản ghi nhận cho GĐ Vùng' });
const show = (receiptCount: string) =>
  render(
    <DirectorRevenueDetail directorId="director-north" receiptCount={receiptCount} />,
    affiliateTestContext(),
  );

beforeAll(setupAffiliateBrowser);
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useGrants).mockReturnValue({
    keys: ['affiliate.view'],
    roleName: 'Read only',
    previewing: false,
  });
  vi.mocked(api.fetchRevenueLedger).mockResolvedValue({
    items: [revenueLedgerFixture],
    nextCursor: cursor,
  });
  vi.mocked(api.fetchRevenueHistory).mockResolvedValue({ items: [], nextCursor: null });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('REQ-617 director detail pagination', () => {
  it('counts remaining records from loaded pages and follows the server cursor to exhaustion', async () => {
    vi.mocked(api.fetchRevenueLedger)
      .mockResolvedValueOnce({ items: [revenueLedgerFixture], nextCursor: cursor })
      .mockResolvedValueOnce({ items: [second], nextCursor: { ...cursor, id: 'second' } })
      .mockResolvedValueOnce({ items: [{ ...second, id: 'third' }], nextCursor: null });
    show('3');
    fireEvent.click(await screen.findByRole('button', { name: '+ 2 khoản khác' }));
    fireEvent.click(await screen.findByRole('button', { name: '+ 1 khoản khác' }));
    await waitFor(() => expect(within(ledger()).getAllByRole('row')).toHaveLength(4));
    expect(api.fetchRevenueLedger).toHaveBeenNthCalledWith(1, 'director-north', null);
    expect(api.fetchRevenueLedger).toHaveBeenNthCalledWith(2, 'director-north', cursor);
    expect(api.fetchRevenueLedger).toHaveBeenNthCalledWith(3, 'director-north', {
      ...cursor,
      id: 'second',
    });
    expect(within(ledger()).queryByRole('button')).toBeNull();
  });

  it('keeps decimal counts exact beyond Number.MAX_SAFE_INTEGER', async () => {
    show('9007199254740994');
    expect(
      await screen.findByRole('button', { name: '+ 9007199254740993 khoản khác' }),
    ).toBeTruthy();
  });

  it('keeps the accessible action name stable while exposing the pending request', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof api.fetchRevenueLedger>>) => void;
    const pending = new Promise<Awaited<ReturnType<typeof api.fetchRevenueLedger>>>((done) => {
      resolve = done;
    });
    vi.mocked(api.fetchRevenueLedger)
      .mockResolvedValueOnce({ items: [revenueLedgerFixture], nextCursor: cursor })
      .mockImplementationOnce(() => pending);
    show('3');
    fireEvent.click(await screen.findByRole('button', { name: '+ 2 khoản khác' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '+ 2 khoản khác' }).getAttribute('aria-busy')).toBe(
        'true',
      ),
    );
    resolve({ items: [second], nextCursor: { ...cursor, id: 'second' } });
    const next = await screen.findByRole('button', { name: '+ 1 khoản khác' });
    expect(next.getAttribute('aria-busy')).toBe('false');
  });

  it.each(['0', '1'])(
    'uses a generic control for stale count %s rather than suppressing a cursor',
    async (count) => {
      vi.mocked(api.fetchRevenueLedger)
        .mockResolvedValueOnce({ items: [revenueLedgerFixture], nextCursor: cursor })
        .mockResolvedValueOnce({ items: [second], nextCursor: null });
      show(count);
      fireEvent.click(await screen.findByRole('button', { name: 'Xem thêm' }));
      expect(await screen.findByText('Khách Bình')).toBeTruthy();
      expect(api.fetchRevenueLedger).toHaveBeenLastCalledWith('director-north', cursor);
      expect(within(ledger()).queryByRole('button')).toBeNull();
    },
  );

  it('does not invent a next page when a stale total exceeds an exhausted cursor', async () => {
    vi.mocked(api.fetchRevenueLedger).mockResolvedValue({
      items: [revenueLedgerFixture],
      nextCursor: null,
    });
    show('9007199254740994');
    await screen.findByText('Khách An');
    expect(within(ledger()).queryByRole('button')).toBeNull();
  });

  it('retains ledger retry and immutable bank history with independent history pagination', async () => {
    vi.mocked(api.fetchRevenueLedger).mockRejectedValueOnce(new Error('offline'));
    const historyCursor = { at: revenueReceiptFixture.paidAt, id: revenueReceiptFixture.id };
    vi.mocked(api.fetchRevenueHistory)
      .mockResolvedValueOnce({ items: [revenueReceiptFixture], nextCursor: historyCursor })
      .mockResolvedValueOnce({
        items: [{ ...revenueReceiptFixture, id: 'older', monthKey: '2026-08' }],
        nextCursor: null,
      });
    show('3');
    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
    await screen.findByRole('button', { name: '+ 2 khoản khác' });
    const history = screen.getByRole('region', { name: 'Lịch sử chi trả' });
    expect(within(history).getByText('DIRECTOR · Vietcombank · 0123456789')).toBeTruthy();
    fireEvent.click(within(history).getByRole('button', { name: 'Xem thêm' }));
    expect(await within(history).findByText(/Tháng 08\/2026/)).toBeTruthy();
    expect(api.fetchRevenueHistory).toHaveBeenLastCalledWith('director-north', historyCursor);
    expect(within(history).getAllByText('DIRECTOR · Vietcombank · 0123456789')).toHaveLength(2);
    expect(api.fetchRevenueLedger).toHaveBeenCalledTimes(2);
  });
});
