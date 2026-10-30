import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  captureMockAffiliateSnapshot,
  restoreMockAffiliateSnapshot,
} from '../affiliate-persistence/snapshot';
import { resetMockDb } from '../store';
import {
  configureMockDirector,
  revokeMockDirector,
  appointMockDirector,
} from '../regional-directors/write';
import { mockRecipientBank } from '../regional-directors/bank';
import { drainMockRevenue } from './capture';
import { mockRevenueState } from './state';
import { payMockDirectorRevenue } from './payout';
import { mockFormerRevenueDirectors } from './dashboard';
import { NOW, revenueCustomer, earn, northSlot } from './revenue.fixture';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  resetMockDb();
});
afterEach(() => vi.useRealTimers());
const reload = () => {
  const wire: unknown = JSON.parse(JSON.stringify(captureMockAffiliateSnapshot()));
  resetMockDb();
  restoreMockAffiliateSnapshot(wire);
};
describe('REQ-617 persisted MSW revenue and beneficiary bank', () => {
  it('REQ-617 paid bank stays frozen after live bank edit; replay adds no audit or notice', () => {
    const customer = revenueCustomer();
    earn(customer.id);
    drainMockRevenue();
    const paid = payMockDirectorRevenue('admin', 'm3', '2026-10', 'original', NOW);
    expect(paid.ok).toBe(true);
    const bank = { bankName: 'BIDV', bankNo: '123456789', bankHolder: 'NEW DESTINATION' };
    expect(
      configureMockDirector('admin', 'north', {
        version: northSlot().version,
        provinces: northSlot().provinces,
        bank,
      }).ok,
    ).toBe(true);
    reload();
    const before = captureMockAffiliateSnapshot();
    expect(payMockDirectorRevenue('admin', 'm3', '2026-10', 'original', NOW)).toEqual(paid);
    expect(captureMockAffiliateSnapshot()).toEqual(before);
    earn(customer.id);
    drainMockRevenue();
    expect(payMockDirectorRevenue('admin', 'm3', '2026-10', 'supplemental', NOW)).toMatchObject({
      ok: true,
      data: { bank, amount: '51' },
    });
  });
  it('AT-GDV04 pending snapshots survive reload/revocation; replacement never inherits bank or shares', () => {
    earn(revenueCustomer().id);
    const bank = structuredClone(northSlot().bank);
    reload();
    expect(mockRevenueState().pending).toHaveLength(1);
    expect(revokeMockDirector('admin', 'north', { version: northSlot().version }).ok).toBe(true);
    expect(northSlot().bank).toBeNull();
    expect(
      appointMockDirector('admin', { region: 'north', userId: 'm2', version: northSlot().version })
        .ok,
    ).toBe(true);
    expect(northSlot().bank).toBeNull();
    reload();
    const former = mockFormerRevenueDirectors({ size: 20 });
    expect(former.items[0]).toMatchObject({ directorId: 'm3', bank, stats: { due: '51' } });
    expect(drainMockRevenue().shares[0]?.director?.id).toBe('m3');
    const paid = payMockDirectorRevenue('admin', 'm3', '2026-10', 'replay', NOW);
    expect(paid).toMatchObject({ ok: true, data: { bank, amount: '51' } });
    reload();
    expect(payMockDirectorRevenue('admin', 'm3', '2026-10', 'replay', NOW)).toEqual(paid);
    expect(mockRevenueState().payouts).toHaveLength(1);
    expect(payMockDirectorRevenue('admin', 'm3', '2026-10', 'new-key', NOW)).toMatchObject({
      status: 409,
    });
    expect(payMockDirectorRevenue('admin', 'm2', '2026-10', 'no-inheritance', NOW)).toMatchObject({
      status: 409,
    });
  });
  it('AT-GDV04 explicit cleared bank remains cleared through reload and reappointment', () => {
    earn(revenueCustomer().id);
    drainMockRevenue();
    expect(
      configureMockDirector('admin', 'north', {
        version: northSlot().version,
        provinces: northSlot().provinces,
        bank: null,
      }).ok,
    ).toBe(true);
    expect(revokeMockDirector('admin', 'north', { version: northSlot().version }).ok).toBe(true);
    reload();
    expect(mockRecipientBank('m3')).toBeNull();
    expect(payMockDirectorRevenue('admin', 'm3', '2026-10', 'bank-cleared', NOW)).toMatchObject({
      status: 409,
    });
    expect(
      appointMockDirector('admin', { region: 'north', userId: 'm3', version: northSlot().version })
        .ok,
    ).toBe(true);
    expect(northSlot().bank).toBeNull();
  });
  it.each(['duplicate-source', 'wrong-total', 'wrong-payout', 'duplicate-bank'] as const)(
    'REQ-617 rejects %s before mutating any persisted state',
    (kind) => {
      earn(revenueCustomer().id);
      drainMockRevenue();
      expect(payMockDirectorRevenue('admin', 'm3', '2026-10', 'once', NOW).ok).toBe(true);
      const before = captureMockAffiliateSnapshot(),
        bad = structuredClone(before);
      const s = bad.revenue!;
      if (kind === 'duplicate-source') s.shares.push({ ...s.shares[0]!, id: crypto.randomUUID() });
      if (kind === 'wrong-total') s.shares[0]!.directorAmount += 1;
      if (kind === 'wrong-payout') s.payouts[0]!.receipt.directorId = 'm2';
      if (kind === 'duplicate-bank')
        bad.directors!.recipientBanks = [
          { directorId: 'm3', bank: null },
          { directorId: 'm3', bank: null },
        ];
      expect(() => restoreMockAffiliateSnapshot(bad)).toThrow();
      expect(captureMockAffiliateSnapshot()).toEqual(before);
    },
  );
  it('D-122 legacy snapshot upgrade never manufactures historical revenue shares', () => {
    const legacy = captureMockAffiliateSnapshot();
    delete legacy.revenue;
    restoreMockAffiliateSnapshot(legacy);
    expect(drainMockRevenue().shares).toEqual([]);
  });
});
