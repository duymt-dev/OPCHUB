import { storeDetailSchema, storeListSchema, type StoreUpsert } from '@opchub/shared/api-domains';
import { moderateMockStores, resetMockDb } from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1`;
const as = (uid: string) => ({ Authorization: `Bearer mock.${uid}` });

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => resetMockDb());
afterAll(() => server.close());

const list = async (qs = '') =>
  storeListSchema.parse(await (await fetch(`${BASE}/stores${qs}`, { headers: as('m2') })).json());

/** V4-608 MSW: Khám phá + lọc + facet, Gian hàng của tôi (sửa / xuất bản), Admin ẩn → biến mất */
describe('MSW Gian hàng địa phương (V4-608)', () => {
  it('Khám phá: 17 gian hàng (1 trang 24), thứ tự Mới nhất như prototype, lọc nhiều giá trị, facet đếm trên toàn bộ', async () => {
    const a = await list();
    expect(a).toMatchObject({ total: 17, size: 24 });
    expect(a.items).toHaveLength(17);
    expect(a.items.slice(0, 3).map((x) => x.id)).toEqual(['st6', 'st9', 'st16']);
    const at = a.items.map((x) => x.updatedAt);
    expect(at).toEqual([...at].sort().reverse());
    expect((await list('?page=2')).items).toHaveLength(0);
    const f = await list('?field=Th%E1%BB%A7y%20s%E1%BA%A3n&kind=product');
    expect(f.items.every((x) => x.field === 'Thủy sản')).toBe(true);
    expect(f.facets.total).toBe(17);
    expect((await list('?q=khongtontai')).total).toBe(0);
  });

  it('chủ DN (M1): sửa → về nháp → rời Khám phá; xuất bản thiếu SP → 400; Cá nhân 403', async () => {
    const mine = storeDetailSchema.parse(
      await (await fetch(`${BASE}/me/store`, { headers: as('m1') })).json(),
    );
    expect(mine).toMatchObject({ id: 'st1', isMine: true, status: 'published' });
    const body: StoreUpsert = {
      name: mine.name,
      slogan: mine.slogan,
      audience: mine.audience,
      field: mine.field,
      province: mine.province,
      intro: mine.intro,
      coverUrl: mine.coverUrl,
      phone: mine.phone,
      email: mine.email,
      website: mine.website,
      address: mine.address,
      items: [],
    };
    const put = await fetch(`${BASE}/me/store`, {
      method: 'PUT',
      headers: { ...as('m1'), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    expect(put.status).toBe(200);
    const un = await fetch(`${BASE}/me/store/unpublish`, { method: 'POST', headers: as('m1') });
    expect(storeDetailSchema.parse(await un.json()).status).toBe('draft');
    expect((await list()).total).toBe(16);
    const pub = await fetch(`${BASE}/me/store/publish`, { method: 'POST', headers: as('m1') });
    expect(pub.status).toBe(400);
    expect(JSON.stringify(await pub.json())).toContain('ít nhất 1 sản phẩm / dịch vụ');
    expect((await fetch(`${BASE}/me/store`, { headers: as('m2') })).status).toBe(403);
  });

  it('Admin ẩn → người khác 404, chủ vẫn xem; xuất bản khi bị ẩn → 409', async () => {
    moderateMockStores('admin', ['st1'], 'hide');
    expect((await fetch(`${BASE}/stores/st1`, { headers: as('m2') })).status).toBe(404);
    expect((await fetch(`${BASE}/stores/st1`, { headers: as('m1') })).status).toBe(200);
    const pub = await fetch(`${BASE}/me/store/publish`, { method: 'POST', headers: as('m1') });
    expect(pub.status).toBe(409);
    moderateMockStores('admin', ['st1'], 'show');
    expect((await fetch(`${BASE}/stores/st1`, { headers: as('m2') })).status).toBe(200);
  });
});
