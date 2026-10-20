import { beforeEach, describe, expect, it } from 'vitest';
import { takeWelcomeMail } from '../inbox';
import { resetMockDb } from '../store';
import { captureMockAffiliateSnapshot, restoreMockAffiliateSnapshot } from './snapshot';

beforeEach(resetMockDb);
describe('MSW shared backend keeps the native one-time welcome contract after F5', () => {
  it('does not replay consumed welcome mail after runtime reset/restore or consume another user mail', () => {
    const id = 'n-new-user@example.test';
    expect(takeWelcomeMail(id)?.to).toBe('new-user@example.test');
    const snapshot = captureMockAffiliateSnapshot();
    resetMockDb();
    restoreMockAffiliateSnapshot(snapshot);
    expect(takeWelcomeMail(id)).toBeNull();
    expect(takeWelcomeMail('n-other@example.test')?.to).toBe('other@example.test');
    resetMockDb();
    expect(takeWelcomeMail(id)?.to).toBe('new-user@example.test');
  });
  it('loads a previous ledger without the new metadata rather than dropping its financial state', () => {
    const before = captureMockAffiliateSnapshot();
    const legacy: unknown = JSON.parse(JSON.stringify({ ...before, welcomeSeen: undefined }));
    resetMockDb();
    restoreMockAffiliateSnapshot(legacy);
    expect(captureMockAffiliateSnapshot()).toEqual(before);
  });
});
