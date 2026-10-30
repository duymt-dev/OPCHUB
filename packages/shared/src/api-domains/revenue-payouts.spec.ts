import { describe, expect, it } from 'vitest';
import {
  revenuePayoutHistoryQuerySchema,
  revenuePayoutRequestSchema,
  revenuePayoutSchema,
} from './revenue-payouts';
import { parseOutboxPayload } from '../outbox';

describe('REQ-617 director payout contracts', () => {
  it('accepts exact aggregate VND beyond safe Number range, rejects fractional/negative/zero totals', () => {
    const amount = revenuePayoutSchema.shape.amount;
    expect(amount.parse('9007199254740993')).toBe('9007199254740993');
    for (const bad of ['0', '-1', '1.5', '01', '1e9', 123])
      expect(amount.safeParse(bad).success).toBe(false);
  });
  it('rejects invalid months, extra payout overrides and partial history cursors', () => {
    expect(revenuePayoutRequestSchema.parse({ monthKey: '2026-09' })).toEqual({
      monthKey: '2026-09',
    });
    expect(revenuePayoutRequestSchema.safeParse({ monthKey: '2026-13' }).success).toBe(false);
    expect(revenuePayoutRequestSchema.safeParse({ monthKey: '2026-09', amount: 1 }).success).toBe(
      false,
    );
    expect(
      revenuePayoutHistoryQuerySchema.safeParse({ beforeAt: '2026-10-01T00:00:00Z' }).success,
    ).toBe(false);
  });
  it('outbox carries a durable receipt ID, not client-supplied recipient or amount', () => {
    const payoutId = '019a0000-0000-7000-8000-000000000001';
    expect(parseOutboxPayload('affiliate.revenue_payout_recorded', { payoutId })).toEqual({
      payoutId,
    });
    expect(() =>
      parseOutboxPayload('affiliate.revenue_payout_recorded', { payoutId, amount: 1 }),
    ).toThrow();
  });
});
