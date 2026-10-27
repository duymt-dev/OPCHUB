import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newMemberMe } from '../../index';
import {
  attachMockAffiliate,
  clickMockAffiliate,
  mockAffiliateBank,
  myMockAffiliate,
} from '../affiliate';
import { affiliateMockState } from '../affiliate';
import { seedMockAffiliateScenario } from '../affiliate-demo';
import { affiliateAdminState } from '../affiliate-admin/state';
import { payMockAffiliateMonth } from '../affiliate-admin/payout';
import { mockAdminAffiliateCustomers, mockAdminAffiliateSummary } from '../affiliate-admin/read';
import {
  cancelMockAffiliateCommissions,
  saveMockAffiliatePolicy,
  setMockAffiliateRates,
} from '../affiliate-admin/write';
import { auditLog, recordAudit } from '../group-admin';
import { feeAction } from '../ops-admin';
import { listSettingsLog, logSetting } from '../settings-log';
import { mockDb, resetMockDb } from '../store';
import { captureMockAffiliateSnapshot, restoreMockAffiliateSnapshot } from './snapshot';

const HA = 'af-owner-a3';
const bank = { bankName: 'BIDV', bankNo: '123456789', bankHolder: 'LE THU HA' } as const;
const PAGE = { page: 1, size: 100 };
const wire = () => JSON.parse(JSON.stringify(captureMockAffiliateSnapshot())) as unknown;
const clicks = () => {
  const me = myMockAffiliate(HA, '');
  if (me.state === 'locked') throw new Error('Expected an existing affiliate');
  return me.stats.clicks30d;
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-01T03:00:00Z'));
  resetMockDb();
  seedMockAffiliateScenario();
});
afterEach(() => vi.useRealTimers());

describe('Affiliate financial persistence boundary for the MSW bridge (not browser transport proof)', () => {
  it('retains all AF0 rows beyond cookie capacity across a fresh runtime', () => {
    const snapshot = captureMockAffiliateSnapshot();
    // D-94 3A: mọi TV là đại lý
    expect(snapshot.agents).toHaveLength(64);
    expect(snapshot.referrals).toHaveLength(51);
    expect(snapshot.fees).toHaveLength(64);
    expect(encodeURIComponent(JSON.stringify(snapshot)).length).toBeGreaterThan(3800);
    const totals = mockAdminAffiliateSummary();
    const serialized = JSON.stringify(snapshot);
    resetMockDb();
    expect(mockDb().fees).toHaveLength(8);
    restoreMockAffiliateSnapshot(JSON.parse(serialized) as unknown);
    seedMockAffiliateScenario(); // The normal request precondition must not seed a second time.
    expect(captureMockAffiliateSnapshot()).toEqual(snapshot);
    expect(mockAdminAffiliateSummary()).toEqual(totals);
  });

  it('retains first fee, auto-created agent, attribution and renewal dedup after reset', () => {
    expect(
      saveMockAffiliatePolicy('admin', {
        defaultRate: 31,
        cookieDays: 45,
        fundraisingRate: 10,
        terms: 'Policy',
      }).ok,
    ).toBe(true);
    const user = newMemberMe('new-affiliate@example.test', 'New Customer');
    attachMockAffiliate(user, 'HAOPC');
    expect(feeAction(user.id, 'collect', Date.now()).ok).toBe(true);
    const before = captureMockAffiliateSnapshot();
    const agent = before.agents.find(([id]) => id === user.id)?.[1];
    expect(agent?.rate).toBe(31);
    expect(before.referrals.find(([id]) => id === user.id)?.[1].row).toMatchObject({
      status: 'recorded',
      rate: 25,
      commission: 300000, // D-70: 25% × 1.200.000
    });
    resetMockDb();
    restoreMockAffiliateSnapshot(before);
    expect(myMockAffiliate(user.id, '')).toMatchObject({ state: 'active', code: agent?.code });
    expect(feeAction(user.id, 'renew', Date.now() + 86400000).ok).toBe(true);
    const after = captureMockAffiliateSnapshot();
    expect(after.referrals).toHaveLength(before.referrals.length);
    expect(after.agents).toHaveLength(before.agents.length);
  });

  it('keeps paid bank/rate snapshots and payout idempotency through bank/rate edits and reset', () => {
    const paid = payMockAffiliateMonth('admin', HA, '2026-10', 'persisted-receipt');
    expect(paid.ok).toBe(true);
    const customers = mockAdminAffiliateCustomers(HA, PAGE);
    expect(mockAffiliateBank(HA, bank).ok).toBe(true);
    expect(setMockAffiliateRates('admin', { ids: [HA], rate: 35 }).ok).toBe(true);
    const snapshot = wire();
    resetMockDb();
    restoreMockAffiliateSnapshot(snapshot);
    expect(myMockAffiliate(HA, '')).toMatchObject({ bank, policy: { rate: 35 } });
    expect(mockAdminAffiliateCustomers(HA, PAGE)).toEqual(customers);
    const audit = auditLog().length;
    const notices = mockDb().notifications.get(HA)?.length;
    expect(payMockAffiliateMonth('admin', HA, '2026-10', 'persisted-receipt')).toEqual(paid);
    expect(auditLog()).toHaveLength(audit);
    expect(mockDb().notifications.get(HA)).toHaveLength(notices ?? 0);
    expect(affiliateAdminState().receipts.size).toBe(1);
  });

  it('retains cancelled reasons without changing cancelled/paid amounts on later rate edits', () => {
    expect(
      cancelMockAffiliateCommissions('admin', {
        ids: ['demo-referral-c1'],
        reason: 'Invalid referral',
      }).ok,
    ).toBe(true);
    expect(setMockAffiliateRates('admin', { ids: ['m1'], rate: 30 }).ok).toBe(true);
    const before = mockAdminAffiliateCustomers('m1', PAGE);
    const snapshot = wire();
    resetMockDb();
    restoreMockAffiliateSnapshot(snapshot);
    expect(mockAdminAffiliateCustomers('m1', PAGE)).toEqual(before);
    expect(affiliateMockState().referrals.get('af-customer-c1')?.row).toMatchObject({
      status: 'cancelled',
      cancelReason: 'Invalid referral',
      commission: 120000,
      rate: 20,
    });
  });

  it('D-110 expired agent stays active; retains old history, policy and click dedup', () => {
    clickMockAffiliate('HAOPC', 'same-ip');
    expect(
      saveMockAffiliatePolicy('admin', {
        defaultRate: 31,
        cookieDays: 45,
        fundraisingRate: 10,
        terms: 'Persisted',
      }).ok,
    ).toBe(true);
    const fee = mockDb().fees.find((row) => row.userId === HA)!;
    fee.status = 'expired';
    fee.validUntil = '2026-10-31T17:00:00.000Z';
    const before = myMockAffiliate(HA, '');
    const snapshot = wire();
    resetMockDb();
    restoreMockAffiliateSnapshot(snapshot);
    clickMockAffiliate('HAOPC', 'same-ip');
    expect(myMockAffiliate(HA, '')).toEqual(before);
    expect(before).toMatchObject({ state: 'active', policy: { cookieDays: 45 } });
    expect(payMockAffiliateMonth('admin', HA, '2026-10', 'paused-after-restore').ok).toBe(true);
  });

  it('does not erase unrelated audit, settings history or notifications on restore', () => {
    const snapshot = wire();
    recordAudit('admin', 'group.update', 'g1', 'Unrelated group');
    logSetting('admin', 'settings.update', '1', 'Unrelated setting', 'settings');
    const notice = {
      id: 'unrelated',
      type: 'event',
      title: 'Other',
      body: '',
      link: '/',
      read: false,
      createdAt: new Date().toISOString(),
    } as const;
    mockDb().notifications.set(HA, [notice]);
    restoreMockAffiliateSnapshot(snapshot);
    restoreMockAffiliateSnapshot(snapshot);
    expect(auditLog().filter((row) => row.action === 'group.update')).toHaveLength(1);
    expect(listSettingsLog().filter((row) => row.summary === 'Unrelated setting')).toHaveLength(1);
    expect(
      mockDb()
        .notifications.get(HA)
        ?.filter((row) => row.id === notice.id),
    ).toEqual([notice]);
  });

  it.each([
    'invalid-rate',
    'duplicate-key',
    'unknown-owner',
    'duplicate-fee',
    'credentials',
    'version',
  ])('rejects %s atomically before any live-state changes', (kind) => {
    const before = captureMockAffiliateSnapshot();
    const invalid = captureMockAffiliateSnapshot();
    if (kind === 'invalid-rate') invalid.agents[0]![1].rate = 51;
    if (kind === 'duplicate-key') invalid.agents.push(invalid.agents[0]!);
    if (kind === 'unknown-owner') invalid.referrals[0]![1].agentId = 'missing';
    if (kind === 'duplicate-fee') invalid.fees.push(invalid.fees[0]!);
    const input =
      kind === 'credentials'
        ? { ...invalid, accessToken: 'must-not-persist' }
        : kind === 'version'
          ? { ...invalid, version: 2 }
          : invalid;
    expect(() => restoreMockAffiliateSnapshot(input)).toThrow();
    expect(captureMockAffiliateSnapshot()).toEqual(before);
  });

  it('does not retain object aliases to captured or incoming state', () => {
    const captured = captureMockAffiliateSnapshot();
    captured.agents[0]![1].rate = 49;
    expect(affiliateMockState().agents.get(captured.agents[0]![0])?.rate).not.toBe(49);
    restoreMockAffiliateSnapshot(captured);
    captured.agents[0]![1].rate = 48;
    expect(affiliateMockState().agents.get(captured.agents[0]![0])?.rate).toBe(49);
  });

  it('restores the base pack without silently opting into AF0', () => {
    resetMockDb();
    const base = wire();
    seedMockAffiliateScenario();
    restoreMockAffiliateSnapshot(base);
    expect(captureMockAffiliateSnapshot()).toMatchObject({ demoSeeded: false });
    expect(mockDb().fees).toHaveLength(8);
    // AF0 chưa nạp: HA không có trong gói cơ bản → không phải đại lý
    expect(myMockAffiliate(HA, '').state).toBe('locked');
    seedMockAffiliateScenario();
    expect(mockDb().fees).toHaveLength(64);
    expect(affiliateMockState().referrals.size).toBe(51);
  });

  it('restores click dedup and still counts a different IP after restore', () => {
    const before = clicks();
    clickMockAffiliate('HAOPC', 'first-ip');
    const snapshot = wire();
    resetMockDb();
    restoreMockAffiliateSnapshot(snapshot);
    clickMockAffiliate('HAOPC', 'first-ip');
    expect(clicks()).toBe(before + 1);
    clickMockAffiliate('HAOPC', 'second-ip');
    expect(clicks()).toBe(before + 2);
  });

  it('retains missing-bank rejection without changing money or creating a receipt', () => {
    affiliateMockState().agents.get(HA)!.bank = null;
    const snapshot = wire();
    resetMockDb();
    restoreMockAffiliateSnapshot(snapshot);
    const before = captureMockAffiliateSnapshot();
    expect(payMockAffiliateMonth('admin', HA, '2026-10', 'no-bank').ok).toBe(false);
    expect(captureMockAffiliateSnapshot()).toEqual(before);
    expect(mockAffiliateBank(HA, bank).ok).toBe(true);
    expect(payMockAffiliateMonth('admin', HA, '2026-10', 'no-bank').ok).toBe(true);
  });

  it('retains the API maximum 200-character idempotency key inside its longer composite key', () => {
    const key = 'x'.repeat(200);
    const paid = payMockAffiliateMonth('admin', HA, '2026-10', key);
    expect(paid.ok).toBe(true);
    const snapshot = wire();
    resetMockDb();
    restoreMockAffiliateSnapshot(snapshot);
    const before = captureMockAffiliateSnapshot();
    expect(payMockAffiliateMonth('admin', HA, '2026-10', key)).toEqual(paid);
    expect(captureMockAffiliateSnapshot()).toEqual(before);
  });
});
