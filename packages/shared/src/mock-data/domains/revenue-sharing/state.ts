import { REVENUE_POLICY_DEFAULTS } from '../../../fixtures/revenue-sharing';
import { mockDb, type MockDb } from '../store';
import { mockRevenueSnapshotSchema, type MockRevenueSnapshot } from './schema';

const states = new WeakMap<MockDb, MockRevenueSnapshot>();
function initial(): MockRevenueSnapshot {
  return {
    policy: { ...REVENUE_POLICY_DEFAULTS },
    // Epoch backfill only: existing paid fees are not retroactive director entitlements.
    first: mockDb().fees.flatMap((f) =>
      f.paidAt && f.amount > 0 ? [[f.userId, f.paidAt] as [string, string]] : [],
    ),
    pending: [],
    shares: [],
    payouts: [],
  };
}
export function mockRevenueState(): MockRevenueSnapshot {
  const db = mockDb();
  let state = states.get(db);
  if (!state) {
    state = initial();
    states.set(db, state);
  }
  return state;
}
export const captureMockRevenueSnapshot = () => mockRevenueSnapshotSchema.parse(mockRevenueState());
/** Restore never invokes capture or delivery. Legacy snapshots backfill epochs, not shares. */
export function restoreMockRevenueSnapshot(input?: MockRevenueSnapshot) {
  states.set(mockDb(), mockRevenueSnapshotSchema.parse(input ?? initial()));
}
export const revenueMonth = (at: string | number) =>
  new Date((typeof at === 'string' ? Date.parse(at) : at) + 7 * 3_600_000)
    .toISOString()
    .slice(0, 7);
