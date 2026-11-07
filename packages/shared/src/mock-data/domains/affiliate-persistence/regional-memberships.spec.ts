import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { seedMockAffiliateScenario } from '../affiliate-demo';
import { mockAffiliateRegion } from '../affiliate-regional-projection';
import { REGIONAL_DEMO_AFFILIATES } from '../regional-share-demo';
import { mockDb, resetMockDb } from '../store';
import { captureMockAffiliateSnapshot, restoreMockAffiliateSnapshot } from './snapshot';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-07T00:00:00Z'));
  resetMockDb();
  seedMockAffiliateScenario();
});
afterEach(() => {
  resetMockDb();
  vi.useRealTimers();
});

describe('Affiliate bridge regional membership persistence across fresh runtimes', () => {
  it('retains every demo owner province/region together with the financial snapshot', () => {
    const regions = REGIONAL_DEMO_AFFILIATES.map((a) => [a.userId, mockAffiliateRegion(a.userId)]);
    expect(mockAffiliateRegion('af-owner-a3')).toMatchObject({ region: 'north' });
    const snapshot = JSON.parse(JSON.stringify(captureMockAffiliateSnapshot())) as unknown;
    resetMockDb();
    restoreMockAffiliateSnapshot(snapshot);
    seedMockAffiliateScenario();
    expect(REGIONAL_DEMO_AFFILIATES.map((a) => [a.userId, mockAffiliateRegion(a.userId)])).toEqual(
      regions,
    );
    expect(captureMockAffiliateSnapshot()).toEqual(snapshot);
  });
  it('does not re-add an intentionally left group or overwrite unrelated membership', () => {
    mockDb().groupMembers.set('af-owner-a3', new Map());
    const snapshot = captureMockAffiliateSnapshot();
    resetMockDb();
    mockDb().groupMembers.set('unrelated-person', new Map([['c2', 'member']]));
    restoreMockAffiliateSnapshot(snapshot);
    expect(mockAffiliateRegion('af-owner-a3')).toBeNull();
    expect(mockDb().groupMembers.get('af-owner-a3')?.size).toBe(0);
    expect(mockDb().groupMembers.get('unrelated-person')).toEqual(new Map([['c2', 'member']]));
  });
  it('reads an older snapshot without overwriting an explicit left membership', () => {
    const snapshot = captureMockAffiliateSnapshot();
    if (!snapshot.regionalShares) throw new Error('Expected regional fixture snapshot');
    delete snapshot.regionalShares.memberships;
    resetMockDb();
    mockDb().groupMembers.set('af-owner-a3', new Map([['c1', 'left']]));
    restoreMockAffiliateSnapshot(snapshot);
    expect(mockAffiliateRegion('af-owner-a2')).toMatchObject({ region: 'north' });
    expect(mockAffiliateRegion('af-owner-a3')).toBeNull();
    expect(mockDb().groupMembers.get('af-owner-a3')).toEqual(new Map([['c1', 'left']]));
    expect(captureMockAffiliateSnapshot().regionalShares?.rows).toEqual(
      snapshot.regionalShares.rows,
    );
  });
  it('rejects an out-of-domain membership before changing any live snapshot data', () => {
    const before = captureMockAffiliateSnapshot();
    expect(() =>
      restoreMockAffiliateSnapshot({
        ...before,
        regionalShares: { ...before.regionalShares, memberships: [['outside-owner', []]] },
      }),
    ).toThrow();
    expect(captureMockAffiliateSnapshot()).toEqual(before);
  });
});
