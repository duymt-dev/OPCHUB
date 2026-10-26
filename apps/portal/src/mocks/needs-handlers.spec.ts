import {
  myNeedsSchema,
  type NeedCreateInput,
  needListSchema,
  needSchema,
  storeDetailSchema,
  storeListSchema,
} from '@opchub/shared/api-domains';
import { moderateMockNeeds, resetMockDb } from '@opchub/shared/mock-domains';
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

const list = async (qs = '') =>
  needListSchema.parse(await (await fetch(`${BASE}/needs${qs}`, { headers: as('m2') })).json());

const NEED: NeedCreateInput = {
  type: 'buy',
  title: 'Cần 200 hộp quà Tết',
  field: 'Thủ công & Làng nghề',
  description: 'Hộp gỗ khắc logo, giao trước 15/01, có hoá đơn VAT.',
  province: 'Hà Nội',
  phone: '0912345678',
};

/** V4-609 MSW: danh sách + gợi ý, chủ đăng / đóng / mở lại / xoá, Admin ẩn, "Đang cần" ở gian hàng */
describe('MSW Nhu cầu địa phương (V4-609)', () => {
  it('11 nhu cầu mẫu mới nhất trước; chip loại / tỉnh / ngành; gợi ý cùng tỉnh', async () => {
    const a = await list();
    expect(a.total).toBe(11);
    const at = a.items.map((x) => x.updatedAt);
    expect(at).toEqual([...at].sort().reverse());
    expect(a.facets.type.find((f) => f.value === 'buy')?.count).toBe(4);
    expect((await list('?type=sell')).items.every((x) => x.type === 'sell')).toBe(true);
    // n1 Mộc Coffee (TP.HCM, Chế biến thực phẩm) → gian hàng cùng ngành nhưng khác tỉnh
    const n1 = a.items.find((x) => x.id === 'n1');
    expect(n1?.suggestion).toMatchObject({ sameProvince: false });
    expect((await list('?q=khongtontai')).total).toBe(0);
  });

  it('chủ DN (M1) đăng → hiện ngay; lỗi copy prototype; đóng → rời danh sách; xoá; Cá nhân 403', async () => {
    const post = (json: unknown) =>
      fetch(`${BASE}/me/needs`, { method: 'POST', headers: as('m1'), body: JSON.stringify(json) });
    const bad = await post({ ...NEED, description: 'ngắn' });
    expect(bad.status).toBe(400);
    expect(JSON.stringify(await bad.json())).toContain('Mô tả chi tiết tối thiểu 20 ký tự');
    const res = await post(NEED);
    expect(res.status).toBe(201);
    const n = needSchema.parse(await res.json());
    expect((await list()).total).toBe(12);
    const step = (action: string) =>
      fetch(`${BASE}/me/needs/${n.id}`, {
        method: 'PATCH',
        headers: as('m1'),
        body: JSON.stringify({ action }),
      });
    expect(needSchema.parse(await (await step('close')).json()).status).toBe('closed');
    expect((await list()).total).toBe(11);
    expect(
      (await fetch(`${BASE}/me/needs/${n.id}`, { method: 'DELETE', headers: as('m1') })).status,
    ).toBe(204);
    const mine = myNeedsSchema.parse(
      await (await fetch(`${BASE}/me/needs`, { headers: as('m1') })).json(),
    );
    expect(mine.store?.id).toBe('st1');
    expect(mine.items.map((x) => x.id)).toEqual(['n11']);
    expect((await fetch(`${BASE}/me/needs`, { headers: as('m2') })).status).toBe(403);
  });

  it('Admin ẩn → rời danh sách, chủ không xoá được; "Đang cần" + badge ở gian hàng', async () => {
    const st2 = storeDetailSchema.parse(
      await (await fetch(`${BASE}/stores/st2`, { headers: as('m2') })).json(),
    );
    expect(st2.openNeeds.map((x) => x.id)).toEqual(['n2']);
    const cards = storeListSchema.parse(
      await (await fetch(`${BASE}/stores`, { headers: as('m2') })).json(),
    );
    expect(cards.items.find((x) => x.id === 'st2')?.seeking).toBe(true);
    expect(cards.items.find((x) => x.id === 'st4')?.seeking).toBe(false);
    moderateMockNeeds('admin', ['n11'], 'hide');
    expect((await list()).items.map((x) => x.id)).not.toContain('n11');
    expect(
      (await fetch(`${BASE}/me/needs/n11`, { method: 'DELETE', headers: as('m1') })).status,
    ).toBe(409);
  });
});
