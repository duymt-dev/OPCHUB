import { adminStoreListSchema } from '@opchub/shared/api-domains';
import { resetMockDb } from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1`;
const as = (uid: string) => ({
  Authorization: `Bearer mock.${uid}`,
  'Content-Type': 'application/json',
});

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => resetMockDb());
afterAll(() => server.close());

const page = async (qs = '') =>
  adminStoreListSchema.parse(
    await (await fetch(`${BASE}/admin/stores${qs}`, { headers: as('admin') })).json(),
  );

/** V4-608 (AD-07) MSW: KPI, lọc trạng thái, ẩn / hiện hàng loạt về trạng thái trước */
describe('MSW Admin › Gian hàng (V4-608)', () => {
  it('KPI 17 / 17 / 0 / 0, 10 dòng / trang, tìm theo tỉnh', async () => {
    const a = await page();
    expect(a.summary).toEqual({ total: 17, published: 17, draft: 0, hidden: 0 });
    expect(a.items).toHaveLength(10);
    expect((await page('?q=c%C3%A0%20mau')).items.every((x) => x.province === 'Cà Mau')).toBe(true);
  });

  it('ẩn 2 → chip Admin đã ẩn = 2; hiện lại → về Đang hiển thị', async () => {
    const post = (a: string, ids: string[]) =>
      fetch(`${BASE}/admin/stores/${a}`, {
        method: 'POST',
        headers: as('admin'),
        body: JSON.stringify({ ids }),
      });
    expect(await (await post('hide', ['st1', 'st2'])).json()).toEqual({ changed: 2 });
    expect((await page('?status=hidden')).items.map((x) => x.id).sort()).toEqual(['st1', 'st2']);
    expect(await (await post('show', ['st1', 'st2', 'st3'])).json()).toEqual({ changed: 2 });
    expect((await page()).summary.hidden).toBe(0);
  });
});
