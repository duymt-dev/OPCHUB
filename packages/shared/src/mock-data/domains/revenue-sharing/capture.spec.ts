import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb, resetMockDb } from '../store';
import { feeAction } from '../ops-admin';
import { auditLog } from '../audit-store';
import { startMockFundraising, settleMockFundraising, reviewMockFundraising } from '../fundraising';
import { captureMockRevenue, drainMockRevenue } from './capture';
import { mockRevenueState } from './state';
import { payMockDirectorRevenue } from './payout';
import { NOW, OCT, revenueCustomer, receipt, earn, northSlot } from './revenue.fixture';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  resetMockDb();
});
afterEach(() => vi.useRealTimers());
describe('REQ-617 MSW actual-receipt capture/outbox (not native proof)', () => {
  it('D-122 backfills epochs only; no shares from existing paid fee/commission data', () => {
    const paid = mockDb().fees.filter((f) => f.paidAt && f.amount > 0);
    expect(mockRevenueState().first).toEqual(paid.map((f) => [f.userId, f.paidAt]));
    expect(drainMockRevenue().shares).toEqual([]);
  });
  it('D-119 snapshots policy/beneficiary before delivery, rounds and deduplicates source replay', () => {
    const customer = revenueCustomer();
    const r = receipt(customer.id);
    const id = captureMockRevenue(r);
    northSlot().bank = null;
    mockRevenueState().policy = { yearOneRate: 80, annualDecrease: 0, minimumRate: 80 };
    expect(captureMockRevenue(r)).toBe(id);
    expect(mockRevenueState().pending).toHaveLength(1);
    expect(drainMockRevenue().shares[0]).toMatchObject({
      id,
      director: { id: 'm3' },
      directorRate: 50,
      directorAmount: 51,
      mediaSoftAmount: 50,
    });
    expect(captureMockRevenue(r)).toBe(id);
    expect(drainMockRevenue().shares).toHaveLength(1);
  });
  it('D-121 vacant, unassigned and direct registration give Media Soft the complete actual receipt', () => {
    const c = revenueCustomer();
    northSlot().incumbent = null;
    earn(c.id);
    northSlot().provinces = [];
    earn(c.id);
    earn('m2');
    expect(drainMockRevenue().shares).toHaveLength(3);
    for (const row of mockRevenueState().shares)
      expect(row).toMatchObject({ director: null, directorAmount: 0, mediaSoftAmount: 101 });
  });
  it('D-122 cross-plan late receipt reanchors unpaid snapshots but never rewrites paid money', () => {
    const c = revenueCustomer();
    earn(c.id);
    drainMockRevenue();
    const paid = payMockDirectorRevenue('admin', 'm3', '2026-10', 'paid-once', NOW);
    expect(paid.ok).toBe(true);
    const frozen = structuredClone(mockRevenueState().shares[0]);
    earn(c.id, { receivedAt: '2026-10-20T03:00:00.000Z' });
    drainMockRevenue();
    earn(c.id, {
      source: 'fundraising',
      plan: 'fundraising',
      receivedAt: '2024-10-15T03:00:00.000Z',
      recordedAt: '2026-11-01T03:00:00.000Z',
    });
    const rows = drainMockRevenue().shares;
    expect(rows[0]).toEqual(frozen);
    expect(rows[1]).toMatchObject({
      customerYear: 3,
      directorRate: 30,
      directorAmount: 30,
      monthKey: '2026-10',
    });
    expect(rows[2]).toMatchObject({ customerYear: 1, directorRate: 50, monthKey: '2026-11' });
    expect(auditLog().filter((r) => r.action === 'affiliate.revenue_review_required')).toHaveLength(
      1,
    );
    earn(c.id);
    drainMockRevenue();
    expect(auditLog().filter((r) => r.action === 'affiliate.revenue_review_required')).toHaveLength(
      1,
    );
  });
  it('REQ-617 fee collection and renewal each capture actual amounts; remind, blocked and zero do not', () => {
    const c = revenueCustomer();
    const fee = mockDb().fees.find((f) => f.userId === c.id)!;
    fee.amount = 101;
    expect(feeAction(c.id, 'remind', Date.parse(OCT)).ok).toBe(true);
    expect(mockRevenueState().pending).toEqual([]);
    expect(feeAction(c.id, 'collect', Date.parse(OCT)).ok).toBe(true);
    expect(feeAction(c.id, 'renew', Date.parse(OCT) + 1).ok).toBe(true);
    expect(feeAction('m3', 'renew', NOW)).toMatchObject({ status: 409 });
    earn(c.id, { amount: 0 });
    expect(drainMockRevenue().shares).toHaveLength(2);
    expect(mockRevenueState().shares.map((r) => r.amount)).toEqual([101, 101]);
  });
  it('REQ-617 fundraising captures on reconciliation, not review, and keeps actual overpayment', () => {
    const project = mockDb().projects.find(
      (p) => p.ownerName === mockDb().fees.find((f) => f.userId === 'm1')?.fullName,
    )!;
    expect(project).toBeDefined();
    const started = startMockFundraising('m1', project.id);
    if (!started.ok) throw new Error('Cannot start fundraising');
    expect(drainMockRevenue().shares).toEqual([]);
    expect(settleMockFundraising(started.data.id, { amount: 1234567, receivedAt: OCT })).toBe(true);
    expect(settleMockFundraising(started.data.id)).toBe(false);
    expect(drainMockRevenue().shares[0]).toMatchObject({
      source: 'fundraising',
      amount: 1234567,
      receivedAt: OCT,
    });
    expect(reviewMockFundraising('admin', project.id, started.data.id, 'reject').ok).toBe(true);
    expect(drainMockRevenue().shares).toHaveLength(1);
  });
});
