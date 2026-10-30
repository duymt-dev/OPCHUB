import { beforeEach, expect, it } from 'vitest';
import { feeSummarySchema } from '../../api-domains';
import { feeSummary, collectFees, remindAllFees } from './fees-admin';
import { mockDb, resetMockDb } from './store';

beforeEach(() => resetMockDb());

it('REQ-616 D-120 counts three directors separately from paid/trial and preserves the total partition', () => {
  const summary = feeSummarySchema.parse(feeSummary());
  expect(summary.regional_director).toBe(3);
  expect(summary.total).toBe(10);
  expect(summary.paid).toBe(summary.active + summary.expiring);
  expect(summary.total).toBe(
    summary.active +
      summary.expiring +
      summary.trial +
      summary.pending_payment +
      summary.expired +
      summary.regional_director,
  );
  const directors = mockDb().fees.filter((fee) => fee.status === 'regional_director');
  const before = structuredClone(directors);
  expect(collectFees(directors.map((fee) => fee.userId))).toEqual({ updated: 0 });
  expect(directors).toEqual(before);
  expect(remindAllFees().queued).toBe(
    mockDb().fees.filter(
      (fee) =>
        fee.status !== 'active' &&
        fee.status !== 'regional_director' &&
        fee.accountType !== 'investor' &&
        mockDb().userStatus.get(fee.userId) === 'active',
    ).length,
  );
});

it('REQ-616 summary accepts legacy payloads but rejects negative or fractional exemption counts', () => {
  const { regional_director: omitted, ...legacy } = feeSummary();
  expect(omitted).toBe(3);
  expect(feeSummarySchema.parse(legacy).regional_director).toBe(0);
  for (const regional_director of [-1, 1.5])
    expect(feeSummarySchema.safeParse({ ...legacy, regional_director }).success).toBe(false);
});
