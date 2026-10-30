import { describe, expect, it } from 'vitest';
import { parseOutboxPayload } from './events';
import { revenueReceiptSchema } from './revenue-sharing';

const snapshot = {
  receipt: {
    source: 'membership',
    sourceId: 'period',
    customerId: 'customer',
    plan: 'business',
    amount: 101,
    receivedAt: '2026-10-01T00:00:00Z',
    recordedAt: '2026-10-02T00:00:00Z',
  },
  firstReceivedAt: '2026-10-01T00:00:00Z',
  policy: { yearOneRate: 50, annualDecrease: 10, minimumRate: 20 },
  affiliateId: null,
  region: null,
  director: null,
};

describe('REQ-617 revenue outbox snapshot contract', () => {
  it('allows valid MS-only receipts and complete director context', () => {
    expect(parseOutboxPayload('affiliate.revenue_received', snapshot)).toEqual(snapshot);
    expect(
      parseOutboxPayload('affiliate.revenue_received', {
        ...snapshot,
        affiliateId: 'affiliate',
        region: 'north',
        director: { id: 'director', name: 'Director', bank: null },
      }).director?.id,
    ).toBe('director');
  });

  it('allows a zero receipt input but never an outbox entry for it', () => {
    const receipt = { ...snapshot.receipt, amount: 0 };
    expect(revenueReceiptSchema.parse(receipt).amount).toBe(0);
    expect(() =>
      parseOutboxPayload('affiliate.revenue_received', { ...snapshot, receipt }),
    ).toThrow();
  });

  it('rejects missing beneficiary context, nonpositive receipts and source/plan mismatches', () => {
    for (const data of [
      { ...snapshot, director: { id: 'd', name: 'D', bank: null } },
      { ...snapshot, receipt: { ...snapshot.receipt, amount: -1 } },
      { ...snapshot, receipt: { ...snapshot.receipt, amount: 2.5 } },
      { ...snapshot, receipt: { ...snapshot.receipt, plan: 'fundraising' } },
      { ...snapshot, policy: { yearOneRate: 50, annualDecrease: 10 } },
      { ...snapshot, firstReceivedAt: '2026-10-01T00:00:00.001Z' },
    ])
      expect(() => parseOutboxPayload('affiliate.revenue_received', data)).toThrow();
  });
});
