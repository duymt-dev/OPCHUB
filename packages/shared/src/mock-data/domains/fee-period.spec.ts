import { beforeEach, expect, it } from 'vitest';
import { feePeriodEnd } from './fee-period';
import { feeAction } from './ops-admin';
import { mockDb, resetMockDb } from './store';

beforeEach(() => resetMockDb());

it.each([
  ['2027-03-01T05:06:07.123Z', '2028-03-01T05:06:07.123Z'],
  ['2028-02-29T05:06:07.123Z', '2029-02-28T05:06:07.123Z'],
  ['2026-10-31T05:06:07.123Z', '2027-10-31T05:06:07.123Z'],
])('REQ-402 BR-05 calendar year %s ends at %s', (start, end) => {
  expect(new Date(feePeriodEnd(Date.parse(start))).toISOString()).toBe(end);
});

it('UAT-10 collects at the injected clock and renews from the later expiry', () => {
  const now = Date.parse('2027-03-01T05:06:07.123Z');
  expect(feeAction('m6', 'collect', now)).toMatchObject({
    ok: true,
    data: { paidAt: new Date(now).toISOString(), validUntil: '2028-03-01T05:06:07.123Z' },
  });
  expect(feeAction('m6', 'renew', now + 1000)).toMatchObject({
    ok: true,
    data: { validUntil: '2029-03-01T05:06:07.123Z', status: 'active' },
  });
  expect(mockDb().fees.find((fee) => fee.userId === 'm6')?.paidAt).toBe(
    new Date(now + 1000).toISOString(),
  );
});
