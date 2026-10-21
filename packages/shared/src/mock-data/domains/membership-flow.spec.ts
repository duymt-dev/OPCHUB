import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newMemberMe } from '../../mock-data';
import { attachMockAffiliate, mockAffiliateReferrals, myMockAffiliate } from './affiliate';
import { scheduleBankWebhook } from './membership-flow';
import { mockDb, resetMockDb } from './store';

beforeEach(() => {
  vi.useFakeTimers();
  resetMockDb();
});
afterEach(() => vi.useRealTimers());
describe('Fake bank payment clock', () => {
  it('AT-AF02 REQ-303 commission uses payment month in VN, never a fixed seed date before registration', async () => {
    vi.setSystemTime(new Date('2026-10-31T16:59:59.500Z'));
    const user = newMemberMe('new-ref@test.vn', 'Khách Giới Thiệu');
    attachMockAffiliate(user, 'OPCAN26');
    scheduleBankWebhook(user.id, 1000);
    await vi.advanceTimersByTimeAsync(1000);
    const fee = mockDb().fees.find((f) => f.userId === user.id);
    expect(fee?.paidAt).toBe('2026-10-31T17:00:00.500Z');
    const rows = mockAffiliateReferrals('m1', { month: '2026-11', page: 1, size: 10 });
    expect(rows.total).toBe(1);
    expect(rows.items[0]).toMatchObject({
      date: fee?.paidAt,
      status: 'recorded',
      commission: 120000,
    });
    expect(mockAffiliateReferrals('m1', { month: '2026-10', page: 1, size: 10 }).total).toBe(0);
    expect(myMockAffiliate(user.id, '').state).toBe('active');
  });
  it('REQ-303 a renewal appends one year to a future expiry, using current payment time', async () => {
    vi.setSystemTime(new Date('2026-11-01T02:00:00Z'));
    const fee = mockDb().fees.find((f) => f.userId === 'm1');
    if (!fee) throw new Error('Missing member');
    fee.validUntil = '2027-10-31T05:00:00.000Z';
    scheduleBankWebhook('m1', 1000);
    await vi.advanceTimersByTimeAsync(1000);
    expect(fee.paidAt).toBe('2026-11-01T02:00:01.000Z');
    expect(fee.validUntil).toBe('2028-10-31T05:00:00.000Z');
  });
});
