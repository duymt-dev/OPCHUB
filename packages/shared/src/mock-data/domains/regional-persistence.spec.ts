import { beforeEach, expect, it } from 'vitest';
import {
  captureMockAffiliateSnapshot,
  restoreMockAffiliateSnapshot,
} from './affiliate-persistence/snapshot';
import { mockRegionalDirectors, mockRegionalRevoke } from './regional-directors';
import { mockDb, resetMockDb } from './store';

beforeEach(() => resetMockDb());
it('keeps revoked slots, history and restored fees coherent after a browser reload', () => {
  expect(mockRegionalRevoke('south', 'Super Admin').ok).toBe(true);
  const status = mockDb().fees.find((f) => f.userId === 'm10')?.status;
  const snapshot = captureMockAffiliateSnapshot();
  resetMockDb();
  restoreMockAffiliateSnapshot(snapshot);
  const data = mockRegionalDirectors(false);
  expect(data.items.find((s) => s.region === 'south')?.member).toBeNull();
  expect(data.history[0]).toMatchObject({ action: 'revoke', userId: 'm10' });
  expect(mockDb().fees.find((f) => f.userId === 'm10')?.status).toBe(status);
});
