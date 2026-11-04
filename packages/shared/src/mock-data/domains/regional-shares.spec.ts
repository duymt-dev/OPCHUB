import { beforeEach, describe, expect, it } from 'vitest';
import { regionalShareSummarySchema, regionalSharePageSchema } from '../../api-domains';
import { decodeRegionalShareCursor } from '../../membership/regional-share-cursor';
import { resetMockDb, mockDb } from './store';
import { seedMockAffiliateScenario } from './affiliate-demo';
import {
  mockRegionalShares,
  mockRegionalSharePage,
  mockPayRegional,
  recordMockRegionalShare,
} from './regional-shares';
import { regionalShareState } from './regional-share-state';
import {
  captureMockAffiliateSnapshot,
  restoreMockAffiliateSnapshot,
} from './affiliate-persistence/snapshot';
import { readMockAffiliatePolicy, replaceMockAffiliatePolicy } from './affiliate-policy';
import { mockRegionalRevoke } from './regional-directors';

beforeEach(() => {
  resetMockDb();
  seedMockAffiliateScenario();
});
describe('TIP-V46-802 mock regional ledger', () => {
  it('summary and keyset pages follow the same API contract', () => {
    const data = regionalShareSummarySchema.parse(mockRegionalShares());
    expect(data.kpi.count).toBeGreaterThan(8);
    const first = mockRegionalSharePage('north', undefined, 8);
    expect(first.ok).toBe(true);
    if (!first.ok) throw Error(first.message);
    regionalSharePageSchema.parse(first.data);
    expect(first.data.items).toHaveLength(8);
    expect(first.data.more).toBeGreaterThan(0);
    expect(decodeRegionalShareCursor(first.data.nextCursor ?? '')).not.toBeNull();
    const second = mockRegionalSharePage('north', first.data.nextCursor ?? undefined, 8);
    expect(second.ok).toBe(true);
    if (second.ok)
      expect(second.data.items.some((r) => first.data.items.some((f) => f.id === r.id))).toBe(
        false,
      );
    expect(mockRegionalSharePage('north', 'invalid', 8)).toMatchObject({ ok: false, status: 422 });
  });
  it('closed-month payment is idempotent, preserves current rows, and survives restore', () => {
    const data = mockRegionalShares();
    const north = data.rows.find((r) => r.region === 'north');
    if (!north?.member) throw Error('Missing north');
    const first = mockPayRegional('north', north.member.id, 'stable-key', 'admin');
    expect(first.ok).toBe(true);
    expect(mockPayRegional('north', north.member.id, 'stable-key', 'admin')).toEqual(first);
    const pending = regionalShareState().rows.filter(
      (r) => r.region === 'north' && r.status === 'pending',
    );
    expect(pending.length).toBeGreaterThan(0);
    const snapshot = captureMockAffiliateSnapshot();
    resetMockDb();
    restoreMockAffiliateSnapshot(snapshot);
    expect(mockPayRegional('north', north.member.id, 'stable-key', 'admin')).toEqual(first);
    expect(
      mockDb()
        .notifications.get(north.member.id)
        ?.filter((n) => n.type === 'affiliate'),
    ).toHaveLength(1);
  });
  it('policy snapshots are immutable and new receipts use new policy', () => {
    const state = regionalShareState();
    const old = state.rows.find((r) => r.region === 'north');
    if (!old) throw Error('Missing row');
    replaceMockAffiliatePolicy({
      ...readMockAffiliatePolicy(),
      regionalFirstYear: 60,
      regionalStep: 15,
      regionalMin: 25,
    });
    recordMockRegionalShare({
      source: 'membership',
      sourceId: 'new-policy',
      customerId: old.customerId,
      baseAmount: 1200000,
      plan: 'personal',
      at: new Date().toISOString(),
    });
    const next = state.rows.find((r) => r.sourceId === 'new-policy');
    expect(next).toBeDefined();
    expect(next?.percent).toBe(Math.max(25, 60 - 15 * ((next?.customerYear ?? 1) - 1)));
    expect(state.rows.find((r) => r.id === old.id)).toEqual(old);
  });
  it('vacant regions retain pending payees and their archived bank', () => {
    const before = mockRegionalShares().rows.find((r) => r.region === 'north');
    mockRegionalRevoke('north', 'Super Admin');
    const after = mockRegionalShares().rows.find((r) => r.region === 'north');
    expect(after?.member).toBeNull();
    expect(after?.payees.find((p) => p.userId === before?.member?.id)?.bank).toEqual(before?.bank);
  });
  it('zero amount never starts a customer year', () => {
    recordMockRegionalShare({
      source: 'fundraising',
      sourceId: 'zero',
      customerId: 'zero-person',
      baseAmount: 0,
      plan: 'fundraising',
      at: new Date().toISOString(),
    });
    expect(regionalShareState().firstPaid.has('zero-person')).toBe(false);
  });
});
