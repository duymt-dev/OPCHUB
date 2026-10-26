import { onboardingSchema } from '@opchub/shared/api-domains';
import { resetMockDb } from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1`;
const as = (uid: string) => ({ Authorization: `Bearer mock.${uid}` });

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  resetMockDb();
  document.cookie = 'opchub-mock-ob=; Path=/; Max-Age=0';
});
afterAll(() => server.close());

const mine = async (uid: string) => {
  const res = await fetch(`${BASE}/me/onboarding`, { headers: as(uid) });
  return {
    status: res.status,
    body: res.status === 200 ? onboardingSchema.parse(await res.json()) : null,
  };
};
const flag = (uid: string, key: string) =>
  fetch(`${BASE}/me/onboarding/flags/${key}`, { method: 'POST', headers: as(uid) });

/** V4-611 MSW: GET /me/onboarding + cờ (D-85) như server */
describe('MSW Hướng dẫn bắt đầu (V4-611)', () => {
  it('M1 6/8; chia sẻ link → 7/8, gọi lại vẫn 204; khoá sai → 404', async () => {
    expect((await mine('m1')).body).toMatchObject({ accountType: 'business', done: 6, total: 8 });
    expect((await flag('m1', 'affiliate_share')).status).toBe(204);
    expect((await flag('m1', 'affiliate_share')).status).toBe(204);
    expect((await mine('m1')).body?.done).toBe(7);
    expect((await flag('m1', 'nope')).status).toBe(404);
  });

  it('TK chưa đóng phí: bước 2–8 khoá; không phải thành viên → 204', async () => {
    const o = (await mine('m6')).body;
    expect(o?.paid).toBe(false);
    expect(o?.steps.filter((s) => s.locked)).toHaveLength(7);
    expect((await mine('inv-nam')).status).toBe(204);
  });
});
