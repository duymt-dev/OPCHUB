import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newMemberMe } from '../../index';
import { attachMockAffiliate, myMockAffiliate } from '../affiliate';
import { configureMockBankWebhookScheduler, scheduleBankWebhook } from '../membership-flow';
import { mockDb, resetMockDb } from '../store';
import { captureMockAffiliateSnapshot, restoreMockAffiliateSnapshot } from './snapshot';
import { enableMockAffiliatePersistence, flushMockAffiliateWebhooks } from './webhooks';

beforeEach(() => {
  vi.useFakeTimers();
  resetMockDb();
});
afterEach(() => {
  configureMockBankWebhookScheduler(undefined);
  vi.useRealTimers();
});

describe('MSW bridge persists scheduled bank events rather than losing timers on reload', () => {
  it('confirms only after the due time, once, even across a fresh runtime', () => {
    enableMockAffiliatePersistence();
    const me = newMemberMe('queued@example.test', 'Queued Member');
    attachMockAffiliate(me);
    const now = Date.now();
    scheduleBankWebhook(me.id, 2200);
    const saved = captureMockAffiliateSnapshot();
    expect(saved.webhooks).toEqual([[me.id, now + 2200]]);
    resetMockDb();
    restoreMockAffiliateSnapshot(saved);
    flushMockAffiliateWebhooks(now + 2199);
    expect(myMockAffiliate(me.id, '').state).toBe('locked');
    flushMockAffiliateWebhooks(now + 2200);
    expect(myMockAffiliate(me.id, '').state).toBe('active');
    const fee = { ...mockDb().fees.find((row) => row.userId === me.id) };
    expect(fee.paidAt).toBe(new Date(now + 2200).toISOString());
    flushMockAffiliateWebhooks(now + 9999);
    expect(mockDb().fees.find((row) => row.userId === me.id)).toEqual(fee);
    expect(captureMockAffiliateSnapshot().webhooks).toEqual([]);
  });
});
