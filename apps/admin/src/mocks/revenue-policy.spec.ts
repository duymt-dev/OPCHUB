import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { affiliatePolicySchema, revenueDashboardSchema } from '@opchub/shared/api-domains';
import { apiErrorSchema } from '@opchub/shared/api';
import { mockAffiliatePolicy, resetMockDb } from '@opchub/shared/mock-domains';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const path = '/admin/affiliate/policy';
const request = (url: string, body?: unknown, actor = 'admin') =>
  fetch(`${location.origin}/v1${url}`, {
    method: body === undefined ? 'GET' : 'PUT',
    headers: { Authorization: `Bearer mock.${actor}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => resetMockDb());
afterAll(() => server.close());
describe('REQ-617 MSW sharing policy HTTP', () => {
  it('writes all rates and returns the same policy to GET and dashboard', async () => {
    const next = { ...mockAffiliatePolicy(), yearOneRate: 63, annualDecrease: 7, minimumRate: 21 };
    const response = await request(path, next);
    expect(response.status).toBe(200);
    expect(affiliatePolicySchema.parse(await response.json())).toEqual(next);
    expect(affiliatePolicySchema.parse(await (await request(path)).json())).toEqual(next);
    const dashboard = await request('/admin/affiliate/revenue/dashboard');
    expect(revenueDashboardSchema.parse(await dashboard.json()).policy).toEqual({
      yearOneRate: 63,
      annualDecrease: 7,
      minimumRate: 21,
    });
  });
  it('rejects invalid fields and missing percentages without changing policy', async () => {
    const before = mockAffiliatePolicy();
    for (const [field, value] of [
      ['yearOneRate', undefined],
      ['yearOneRate', 101],
      ['annualDecrease', 1.5],
      ['minimumRate', 51],
    ] as const) {
      const response = await request(path, { ...before, [field]: value });
      expect(response.status).toBe(400);
      expect(apiErrorSchema.parse(await response.json()).error.fields?.[0]?.path).toBe(field);
    }
    expect(mockAffiliatePolicy()).toEqual(before);
  });
  it('refuses a caller without the affiliate.action key', async () => {
    const before = mockAffiliatePolicy();
    const response = await request(path, { ...before, yearOneRate: 70 }, 'adm-hang');
    expect(response.status).toBe(403);
    expect(mockAffiliatePolicy()).toEqual(before);
  });
});
