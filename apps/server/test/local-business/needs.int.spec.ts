import { planAmount } from '../factories/prices';
import {
  adminNeedListSchema,
  myNeedsSchema,
  type NeedCreateInput,
  needListSchema,
  needSchema,
  storeDetailSchema,
  storeListSchema,
  type StoreUpsert,
} from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { StoreAutoCreateHandler } from '@/modules/local-business';
import { confirmFee } from '../factories/affiliate.factory';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const STORE: StoreUpsert = {
  name: 'Xưởng rang thử',
  slogan: '',
  audience: 'business',
  field: 'Chế biến thực phẩm',
  province: 'Đắk Lắk',
  intro: 'Rang xay cà phê Robusta cho quán và văn phòng, giao hàng toàn quốc.',
  coverUrl: null,
  phone: '',
  email: '',
  website: '',
  address: '',
  items: [{ kind: 'product', name: 'Cà phê rang', price: null, description: '', imageUrl: null }],
};

const NEED: NeedCreateInput = {
  type: 'buy',
  title: 'Cần 50 kg cà phê Robusta rang mộc mỗi tháng',
  field: 'Chế biến thực phẩm',
  description: 'Ưu tiên xưởng rang có truy xuất nguồn gốc, giao hằng tháng tại quán.',
  quantity: '50 kg / tháng',
  province: 'Đắk Lắk',
  phone: '0912345678',
};

/**
 * TIP-V4-609 (REQ-511, D-75, AD-07): chủ gian hàng đăng nhu cầu (hiện ngay) → danh sách + gợi ý
 * gian hàng cùng ngành / tỉnh → đóng / mở lại / xoá → Admin ẩn / hiện (audit) → "Đang cần" ở gian hàng.
 */
describe('Nhu cầu địa phương (TIP-V4-609)', () => {
  let t: TestApp;
  let admin: string;
  let viewer: string;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    viewer = await tokenOf(t, await createUser(t, { fee: 'active' }));
  });
  beforeEach(async () => {
    await flushAuthState(t);
    await t.redis.client.del('needs:facets', 'stores:facets');
  });
  afterAll(async () => {
    const owners = { owner: { email: { endsWith: '@test.opchub.vn' } } };
    await t.prisma.db.need.deleteMany({ where: owners });
    await t.prisma.db.store.deleteMany({ where: owners });
    await t.close();
  });

  /** TK DN đóng phí → gian hàng nháp → sửa + xuất bản */
  async function storeOwner(store: Partial<StoreUpsert> = {}) {
    const u = await createUser(t, { accountType: 'business', fee: 'pending_payment' });
    const p = await confirmFee(t, u.id, new Date(), planAmount('business'));
    await t.app.get(StoreAutoCreateHandler).onFeeConfirmed(p);
    const token = await tokenOf(t, u);
    await t.call('/me/store', { method: 'PUT', token, json: { ...STORE, ...store } });
    await t.call('/me/store/publish', { method: 'POST', token });
    return { u, token };
  }
  const post = (token: string, json: NeedCreateInput) =>
    t.call('/me/needs', { method: 'POST', token, json });
  const list = async (qs: string) =>
    needListSchema.parse(await (await t.call(`/needs${qs}`, { token: viewer })).json());

  it('UP-09 / D-75: chủ gian hàng đăng → hiện ngay; lỗi theo copy prototype; Cá nhân 403', async () => {
    const { token } = await storeOwner();
    const bad = await post(token, { ...NEED, description: 'ngắn', phone: '' });
    expect(bad.status).toBe(400);
    const body = JSON.stringify(await bad.json());
    expect(body).toContain('Mô tả chi tiết tối thiểu 20 ký tự');
    expect(body).toContain('Nhập số điện thoại hoặc email liên hệ');
    const other = await post(token, { ...NEED, field: 'Khác' });
    expect(JSON.stringify(await other.json())).toContain('Nhập ngành bạn cần tìm');

    const res = await post(token, { ...NEED, budgetMin: 1_000_000, budgetMax: 3_000_000 });
    expect(res.status).toBe(201);
    const n = needSchema.parse(await res.json());
    expect(n).toMatchObject({ status: 'open', isMine: true, budgetMin: 1_000_000 });
    expect((await list(`?q=${encodeURIComponent(NEED.title)}`)).items.map((x) => x.id)).toContain(
      n.id,
    );

    const per = await tokenOf(t, await createUser(t, { fee: 'active' }));
    expect((await post(per, NEED)).status).toBe(403);
    expect((await t.call('/me/needs', { token: per })).status).toBe(403);
  });

  it('gợi ý: đếm gian hàng cùng ngành, ưu tiên cùng tỉnh, trừ gian hàng của chính mình', async () => {
    const a = await storeOwner();
    await storeOwner({ name: 'Rang xay khác tỉnh', province: 'Lâm Đồng' });
    const n = needSchema.parse(
      await (await post(a.token, { ...NEED, title: 'Gợi ý thử nghiệm duy nhất' })).json(),
    );
    const got = (await list('?q=G%E1%BB%A3i%20%C3%BD%20th%E1%BB%AD')).items.find(
      (x) => x.id === n.id,
    );
    expect(got?.suggestion?.count).toBeGreaterThan(0);
    const other = await storeOwner({ name: 'Rang xay cùng tỉnh' });
    const n2 = needSchema.parse(
      await (await post(other.token, { ...NEED, title: 'Gợi ý cùng tỉnh duy nhất' })).json(),
    );
    expect(n2.suggestion).toMatchObject({ sameProvince: true });
  });

  it('đóng → rời danh sách; mở lại → quay lại; "Đang cần" + badge ở gian hàng; xoá', async () => {
    const { token } = await storeOwner();
    const n = needSchema.parse(
      await (await post(token, { ...NEED, title: 'Nhu cầu đóng mở thử' })).json(),
    );
    const store = storeDetailSchema.parse(await (await t.call('/me/store', { token })).json());
    expect(store.openNeeds.map((x) => x.id)).toContain(n.id);
    const cards = storeListSchema.parse(
      await (await t.call(`/stores?q=${encodeURIComponent(STORE.name)}`, { token: viewer })).json(),
    );
    expect(cards.items.find((x) => x.id === store.id)?.seeking).toBe(true);

    const patch = (action: string) =>
      t.call(`/me/needs/${n.id}`, { method: 'PATCH', token, json: { action } });
    expect((await patch('close')).status).toBe(200);
    expect((await patch('close')).status).toBe(409);
    expect((await list('?q=Nhu%20c%E1%BA%A7u%20%C4%91%C3%B3ng')).total).toBe(0);
    const re = needSchema.parse(await (await patch('reopen')).json());
    expect(Date.parse(re.updatedAt)).toBeGreaterThan(Date.parse(n.updatedAt));
    expect((await list('?q=Nhu%20c%E1%BA%A7u%20%C4%91%C3%B3ng')).total).toBe(1);

    const other = await tokenOf(t, (await storeOwner()).u);
    expect((await t.call(`/me/needs/${n.id}`, { method: 'DELETE', token: other })).status).toBe(
      404,
    );
    expect((await t.call(`/me/needs/${n.id}`, { method: 'DELETE', token })).status).toBe(204);
    const mine = myNeedsSchema.parse(await (await t.call('/me/needs', { token })).json());
    expect(mine.items.map((x) => x.id)).not.toContain(n.id);
  });

  it('AD-07: Admin ẩn hàng loạt → rời danh sách, audit; hiện lại về trạng thái trước; thiếu quyền 403', async () => {
    const { token } = await storeOwner();
    const a = needSchema.parse(await (await post(token, { ...NEED, title: 'Ẩn thử A' })).json());
    const b = needSchema.parse(await (await post(token, { ...NEED, title: 'Ẩn thử B' })).json());
    await t.call(`/me/needs/${b.id}`, { method: 'PATCH', token, json: { action: 'close' } });

    expect(
      (await t.call('/admin/needs/hide', { method: 'POST', token: viewer, json: { ids: [a.id] } }))
        .status,
    ).toBe(403);
    const hid = await t.call('/admin/needs/hide', {
      method: 'POST',
      token: admin,
      json: { ids: [a.id, b.id] },
    });
    expect(await hid.json()).toEqual({ changed: 2 });
    expect(
      await t.prisma.db.auditLog.count({
        where: { action: 'need.hide', entityId: { in: [a.id, b.id] } },
      }),
    ).toBe(2);
    expect((await list('?q=%E1%BA%A8n%20th%E1%BB%AD')).total).toBe(0);
    const hiddenDel = await t.call(`/me/needs/${a.id}`, { method: 'DELETE', token });
    expect(hiddenDel.status).toBe(409);

    const adm = adminNeedListSchema.parse(
      await (await t.call('/admin/needs?status=hidden', { token: admin })).json(),
    );
    expect(adm.items.map((x) => x.id)).toEqual(expect.arrayContaining([a.id, b.id]));
    await t.call('/admin/needs/show', {
      method: 'POST',
      token: admin,
      json: { ids: [a.id, b.id] },
    });
    const rows = await t.prisma.db.need.findMany({
      where: { id: { in: [a.id, b.id] } },
      select: { id: true, status: true },
    });
    expect(Object.fromEntries(rows.map((r) => [r.id, r.status]))).toEqual({
      [a.id]: 'open',
      [b.id]: 'closed',
    });
  });
});
