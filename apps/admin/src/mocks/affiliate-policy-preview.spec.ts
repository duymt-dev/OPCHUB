import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { apiErrorSchema } from '@opchub/shared/api';
import { affiliateAdminPolicyPreviewSchema } from '@opchub/shared/api-domains';
import {
  affiliateMockState,
  listSettingsLog,
  mockAffiliatePolicy,
  resetMockDb,
  seedMockAffiliateScenario,
} from '@opchub/shared/mock-domains';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const send = (query: string, actor = 'admin') =>
  fetch(`${location.origin}/v1/admin/affiliate/policy/preview${query}`, {
    headers: actor ? { Authorization: `Bearer mock.${actor}` } : {},
  });
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  resetMockDb();
  seedMockAffiliateScenario();
});
afterAll(() => server.close());

describe('REQ-308 REQ-312 policy preview fake API mirrors the native contract', () => {
  it.each([
    [1, 6000],
    [20, 120000],
    [27, 162000],
    [50, 300000],
  ])(
    'returns the fixed list price and server-owned example for %i percent',
    async (rate, commission) => {
      const response = await send(`?rate=${rate}`);
      expect(response.status).toBe(200);
      expect(affiliateAdminPolicyPreviewSchema.parse(await response.json())).toEqual({
        rate,
        feeAmount: 600000,
        commission,
      });
    },
  );

  it.each(['', '?rate=', '?rate=0', '?rate=51', '?rate=1.5', '?rate=oops'])(
    'returns rate field errors for invalid query %s',
    async (query) => {
      const response = await send(query);
      expect(response.status).toBe(400);
      const error = apiErrorSchema.parse(await response.json()).error;
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.fields).toHaveLength(1);
      expect(error.fields?.[0]?.path).toBe('rate');
      expect(typeof error.fields?.[0]?.message).toBe('string');
    },
  );

  it('guards anonymous and missing-view requests before validating the draft', async () => {
    expect((await send('?rate=20', '')).status).toBe(401);
    expect((await send('?rate=20', 'adm-hang')).status).toBe(403);
    expect((await send('?rate=oops', 'adm-hang')).status).toBe(403);
    expect((await send('?rate=oops', '')).status).toBe(401);
  });

  it('does not mutate policy, money, payout snapshots or audit when previewing a new draft', async () => {
    const policy = mockAffiliatePolicy();
    const referrals = JSON.stringify([...affiliateMockState().referrals]);
    const payouts = JSON.stringify([...affiliateMockState().payouts]);
    const audit = listSettingsLog().length;
    expect((await send('?rate=27')).status).toBe(200);
    expect(mockAffiliatePolicy()).toEqual(policy);
    expect(JSON.stringify([...affiliateMockState().referrals])).toBe(referrals);
    expect(JSON.stringify([...affiliateMockState().payouts])).toBe(payouts);
    expect(listSettingsLog()).toHaveLength(audit);
  });
});
