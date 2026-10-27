import { PRICE_DEFAULTS } from '@opchub/shared/fixtures';
import { reviewMockFundraising, resetMockDb } from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1`;
const as = (uid: string) => ({ Authorization: `Bearer mock.${uid}` });

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => resetMockDb());
afterAll(() => server.close());

const json = async <T>(r: Response) => (await r.json()) as T;
type Pay = { id: string; code: string; status: string; transferContent: string; amount: number };
type Detail = {
  fundraisingActive: boolean;
  funding: unknown;
  fundraising: { status: string } | null;
};

/** V4-610 MSW: mã GV, D-31 webhook trễ, Admin duyệt → tab Gọi vốn; legacy seed vẫn hiện */
describe('MSW Gói Gọi vốn (V4-610)', () => {
  it('dự án seed có khai báo gọi vốn = đang gọi vốn (legacy); người khác thấy funding', async () => {
    const d = await json<Detail>(await fetch(`${BASE}/projects/p1`, { headers: as('m1') }));
    expect(d).toMatchObject({ fundraisingActive: true });
    expect(d.funding).not.toBeNull();
  });

  it('chủ dự án mua: mã GV, gọi lại cùng mã; người khác 404; xác nhận → webhook trễ → chờ duyệt', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const start = () =>
        fetch(`${BASE}/projects/p10/fundraising`, { method: 'POST', headers: as('m1') });
      const a = await json<Pay>(await start());
      expect(a).toMatchObject({ amount: PRICE_DEFAULTS.fund.p, status: 'pending_payment' });
      expect(a.code).toMatch(/^GV\d{6}$/);
      expect(a.transferContent).toBe(`OPCHUB ${a.code}`);
      expect((await json<Pay>(await start())).id).toBe(a.id);
      const other = await fetch(`${BASE}/projects/p10/fundraising`, {
        method: 'POST',
        headers: as('m2'),
      });
      expect(other.status).toBe(404);
      const c = await fetch(`${BASE}/me/fundraisings/${a.id}/transfer-confirm`, {
        method: 'POST',
        headers: { ...as('m1'), 'Idempotency-Key': 'k' },
      });
      expect(c.status).toBe(202);
      await vi.runAllTimersAsync();
      const mine = await json<{ items: Pay[] }>(
        await fetch(`${BASE}/me/fundraisings`, { headers: as('m1') }),
      );
      expect(mine.items[0]).toMatchObject({ id: a.id, status: 'pending_review' });
      expect((await start()).status).toBe(409);
      expect(reviewMockFundraising('admin', 'p10', a.id, 'approve').ok).toBe(true);
      const d = await json<Detail>(await fetch(`${BASE}/projects/p10`, { headers: as('m1') }));
      expect(d).toMatchObject({ fundraisingActive: true, fundraising: { status: 'active' } });
    } finally {
      vi.useRealTimers();
    }
  });
});
