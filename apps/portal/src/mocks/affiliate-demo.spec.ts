import { loginResponseSchema } from '@opchub/shared/api';
import {
  affiliateCodeResultSchema,
  affiliateReferralsSchema,
  myAffiliateSchema,
} from '@opchub/shared/api-domains';
import { resetMockDb } from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1`;
const login = (password = 'User@2026') =>
  fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'ha.le@opcmedia.vn', password }),
  });
const get = (path: string) =>
  fetch(`${BASE}${path}`, { headers: { Authorization: 'Bearer mock.m1' } });
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  resetMockDb();
  document.cookie = 'opchub-mock-affiliate-demo=; Max-Age=0; Path=/';
  document.cookie = 'opchub-msw-session=; Max-Age=0; Path=/';
});
afterAll(() => {
  document.cookie = 'opchub-mock-affiliate-demo=; Max-Age=0; Path=/';
  document.cookie = 'opchub-msw-session=; Max-Age=0; Path=/';
  server.close();
});

describe('Affiliate demo middleware', () => {
  it('REQ-303 extra owner is unavailable without explicit fixture cookie', async () => {
    expect((await login()).status).toBe(401);
    const code = affiliateCodeResultSchema.parse(
      await (await get('/public/affiliate/codes/HAOPC')).json(),
    );
    expect(code).toMatchObject({ valid: false, reason: 'not_found' });
  });
  it('REQ-303 fixture loads before auth; HAOPC is owned by the logged-in member', async () => {
    document.cookie = 'opchub-mock-affiliate-demo=1; Path=/';
    expect((await login('wrong')).status).toBe(401);
    const res = await login();
    expect(res.status).toBe(200);
    const session = loginResponseSchema.parse(await res.json());
    expect(session.me).toMatchObject({ id: 'af-owner-a3', fullName: 'Lê Thu Hà' });
    const code = affiliateCodeResultSchema.parse(
      await (await get('/public/affiliate/codes/HAOPC?email=ha.le%40opcmedia.vn')).json(),
    );
    expect(code).toMatchObject({ valid: false, reason: 'self' });
  });
  it('REQ-311 history endpoints expose populated DTOs, exact totals and masked names', async () => {
    document.cookie = 'opchub-mock-affiliate-demo=1; Path=/';
    const profile = myAffiliateSchema.parse(await (await get('/me/affiliate')).json());
    // D-110 / BR-AFF-REV: gói thực trả như prototype v4.2 (P-97: Đã nhận 2.400.000đ)
    expect(profile).toMatchObject({ stats: { paidCount: 11, received: 2400000 } });
    const refs = affiliateReferralsSchema.parse(
      await (await get('/me/affiliate/referrals?month=2026-10&page=1&size=6')).json(),
    );
    expect(refs.total).toBe(3);
    expect(refs.summary.commission).toBe(1200000);
    expect(refs.items[0]?.name).toBe('Đỗ Minh T.');
  });
});
