import { beforeEach, describe, expect, it } from 'vitest';
import { REVENUE_DEMO } from '../../../fixtures/revenue-demo';
import { seedMockRevenueScenario } from '../revenue-sharing/scenario';
import { mockDb, resetMockDb } from '../store';
import { captureMockAffiliateSnapshot, restoreMockAffiliateSnapshot } from './snapshot';

beforeEach(() => {
  resetMockDb();
  seedMockRevenueScenario();
});
describe('D-121 persisted affiliate province membership', () => {
  it('restores memberships and counters idempotently, including an explicit leave', () => {
    const before = captureMockAffiliateSnapshot();
    const counts = mockDb().groups.map((g) => [g.id, g.memberCount]);
    resetMockDb();
    restoreMockAffiliateSnapshot(before);
    restoreMockAffiliateSnapshot(before);
    expect(mockDb().groups.map((g) => [g.id, g.memberCount])).toEqual(counts);
    const groups = mockDb().groupMembers.get(REVENUE_DEMO.agentId);
    const group = mockDb().groups.find((g) => groups?.has(g.id));
    if (!group) throw new Error('Missing demo province');
    group.memberCount--;
    mockDb().groupMembers.set(REVENUE_DEMO.agentId, new Map());
    const left = captureMockAffiliateSnapshot();
    resetMockDb();
    restoreMockAffiliateSnapshot(left);
    seedMockRevenueScenario();
    expect(mockDb().groupMembers.get(REVENUE_DEMO.agentId)?.size).toBe(0);
    expect(captureMockAffiliateSnapshot()).toEqual(left);
  });
  it('legacy snapshots preserve existing memberships instead of erasing all provinces', () => {
    const { memberships: omitted, ...legacy } = captureMockAffiliateSnapshot();
    void omitted;
    const before = structuredClone(mockDb().groupMembers);
    restoreMockAffiliateSnapshot(legacy);
    expect(mockDb().groupMembers).toEqual(before);
  });
  it.each(['missing', 'foreign', 'duplicate'])('rejects %s owner membership atomically', (kind) => {
    const before = captureMockAffiliateSnapshot();
    const bad = structuredClone(before);
    if (!bad.memberships) throw new Error('Missing memberships');
    if (kind === 'missing') bad.memberships.pop();
    if (kind === 'foreign') bad.memberships.push(['unknown', []]);
    if (kind === 'duplicate') bad.memberships.push([REVENUE_DEMO.agentId, []]);
    expect(() => restoreMockAffiliateSnapshot(bad)).toThrow();
    expect(captureMockAffiliateSnapshot()).toEqual(before);
  });
});
