import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import {
  affiliateMockState,
  listSettingsLog,
  mockAffiliatePolicy,
  resetMockDb,
  seedMockAffiliateScenario,
  setMockAdminStatus,
} from '@opchub/shared/mock-domains';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const send = (path: string, method = 'GET', body?: unknown) =>
  fetch(`${location.origin}/v1${path}`, {
    method,
    headers: {
      Authorization: 'Bearer mock.adm-mai',
      'Content-Type': 'application/json',
      'Idempotency-Key': 'locked-account-must-not-pay',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  resetMockDb();
  seedMockAffiliateScenario();
});
afterAll(() => server.close());

describe('REQ-312 Affiliate MSW rejects an already-issued session after account lock', () => {
  it.each([
    ['/admin/affiliate/summary'],
    ['/admin/affiliate/commissions'],
    ['/admin/affiliates'],
    ['/admin/affiliate/policy'],
    ['/admin/affiliates/m1'],
    ['/admin/affiliates/m1/months'],
    ['/admin/affiliates/m1/customers'],
  ])('rejects stale bearer reads at %s, and accepts the same actor after unlock', async (path) => {
    expect((await send(path)).status).toBe(200);
    expect(setMockAdminStatus('admin', 'adm-mai', 'locked').ok).toBe(true);
    expect((await send(path)).status).toBe(401);
    expect(setMockAdminStatus('admin', 'adm-mai', 'active').ok).toBe(true);
    expect((await send(path)).status).toBe(200);
  });

  it.each([
    ['/admin/affiliate/commissions/cancel', 'POST', { ids: ['demo-referral-c1'], reason: 'Test' }],
    ['/admin/affiliates/rate', 'PUT', { ids: ['m1'], rate: 31 }],
    ['/admin/affiliates/m1', 'PATCH', { rate: 31 }],
    ['/admin/affiliate/policy', 'PUT', { defaultRate: 31, cookieDays: 45, terms: 'Test' }],
    ['/admin/affiliates/m1/payouts', 'POST', { monthKey: '2026-09' }],
    ['/admin/affiliate/commissions/export', 'POST', { ids: ['demo-referral-c1'] }],
    ['/admin/affiliates/export', 'POST', { ids: ['m1'] }],
  ] as const)(
    'blocks stale bearer mutation %s before financial/audit side effects',
    async (path, method, body) => {
      expect(setMockAdminStatus('admin', 'adm-mai', 'locked').ok).toBe(true);
      const before = JSON.stringify([...affiliateMockState().referrals]);
      const payouts = JSON.stringify([...affiliateMockState().payouts]);
      const policy = mockAffiliatePolicy();
      const audit = listSettingsLog().length;
      expect((await send(path, method, body)).status).toBe(401);
      expect(JSON.stringify([...affiliateMockState().referrals])).toBe(before);
      expect(JSON.stringify([...affiliateMockState().payouts])).toBe(payouts);
      expect(mockAffiliatePolicy()).toEqual(policy);
      expect(listSettingsLog()).toHaveLength(audit);
    },
  );
});
