import { PRICE_DEFAULTS } from '@opchub/shared/fixtures';
import {
  FUNDRAISING_BRIDGE_COOKIE,
  resetMockDb,
  reviewMockFundraising,
  settleMockFundraising,
} from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1`;
const as = (uid: string) => ({ Authorization: `Bearer mock.${uid}` });

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  resetMockDb();
  // cầu cookie Portal ↔ Admin sống trong jsdom giữa các test → xoá để mỗi test độc lập
  document.cookie = `${FUNDRAISING_BRIDGE_COOKIE}=; Path=/; Max-Age=0`;
});
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
      // D-105: OPCHUB [Mã TV chủ] [SĐT] GV[mã]
      expect(a.transferContent).toBe(`OPCHUB TV000001 0912345678 ${a.code}`);
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

  const startP10 = () =>
    fetch(`${BASE}/projects/p10/fundraising`, { method: 'POST', headers: as('m1') });
  const resubmit = (id: string, key: string | null = 'k') =>
    fetch(`${BASE}/me/fundraisings/${id}/resubmit`, {
      method: 'POST',
      headers: key ? { ...as('m1'), 'Idempotency-Key': key } : as('m1'),
    });

  it('D-113 F6: bị từ chối → mua lại 409; gửi lại → chờ duyệt, cùng mã + số tiền; lần nữa 409', async () => {
    const a = await json<Pay>(await startP10());
    expect(settleMockFundraising(a.id)).toBe(true);
    expect(reviewMockFundraising('admin', 'p10', a.id, 'reject', 'Thiếu báo cáo').ok).toBe(true);
    const mine = await json<{ items: (Pay & { reviewNote: string | null })[] }>(
      await fetch(`${BASE}/me/fundraisings`, { headers: as('m1') }),
    );
    expect(mine.items[0]).toMatchObject({ status: 'rejected', reviewNote: 'Thiếu báo cáo' });
    expect((await startP10()).status).toBe(409);
    expect((await resubmit(a.id, null)).status).toBe(400);
    const r = await resubmit(a.id);
    expect(r.status).toBe(200);
    expect(await json<Pay>(r)).toMatchObject({
      id: a.id,
      code: a.code,
      amount: a.amount,
      status: 'pending_review',
    });
    expect((await resubmit(a.id)).status).toBe(409);
  });

  it('D-106: đang gọi vốn còn ≤ 14 ngày vẫn 409 (không mua sớm), như server', async () => {
    const a = await json<Pay>(await startP10());
    settleMockFundraising(a.id);
    const ok = reviewMockFundraising('admin', 'p10', a.id, 'approve');
    expect(ok.ok).toBe(true);
    if (ok.ok) ok.data.endsAt = new Date(Date.now() + 5 * 86_400_000).toISOString();
    expect((await startP10()).status).toBe(409);
  });
});
