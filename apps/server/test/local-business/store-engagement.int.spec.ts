import { planAmount } from '../factories/prices';
import {
  adminStoreSchema,
  storeDetailSchema,
  storeFavoriteResultSchema,
  storeListSchema,
  type StoreUpsert,
} from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { StoreAutoCreateHandler } from '@/modules/local-business';
import { confirmFee } from '../factories/affiliate.factory';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const NOW = new Date('2026-10-24T03:00:00Z');

const FULL: StoreUpsert = {
  name: 'Gian hàng tương tác thử',
  slogan: 'Đặc sản địa phương',
  audience: 'business',
  field: 'Thủy sản',
  province: 'Cà Mau',
  intro: 'Thu mua và chế biến tôm khô, mực khô từ ngư dân Sông Đốc, đạt OCOP 4 sao.',
  coverUrl: null,
  phone: '+84 290 385 1122',
  email: 'tuongtac@test.opchub.vn',
  website: '',
  address: 'Xã Sông Đốc, Cà Mau',
  items: [{ kind: 'product', name: 'Tôm khô', price: 450000, description: '', imageUrl: null }],
};

/** TIP-V4-624 (D-89, P-105): lượt xem chi tiết, tim yêu thích, Admin gắn "Nổi bật" (audit) */
describe('Gian hàng · lượt xem, yêu thích, Nổi bật', () => {
  let t: TestApp;
  let admin: string;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
  });
  beforeEach(() => flushAuthState(t));
  afterAll(async () => {
    await t.prisma.db.store.deleteMany({
      where: { owner: { email: { endsWith: '@test.opchub.vn' } } },
    });
    await t.close();
  });

  async function publishedStore() {
    const u = await createUser(t, { accountType: 'business', fee: 'pending_payment' });
    const p = await confirmFee(t, u.id, NOW, planAmount('business'));
    await t.app.get(StoreAutoCreateHandler).onFeeConfirmed(p);
    const token = await tokenOf(t, u);
    await t.call('/me/store', { method: 'PUT', token, json: FULL });
    const s = storeDetailSchema.parse(
      await (await t.call('/me/store/publish', { method: 'POST', token })).json(),
    );
    return { id: s.id, token };
  }
  const cardOf = async (token: string, id: string) => {
    const q = encodeURIComponent(FULL.name);
    const list = storeListSchema.parse(await (await t.call(`/stores?q=${q}`, { token })).json());
    return list.items.find((x) => x.id === id);
  };

  it('mở chi tiết tăng lượt xem (chủ tự xem không tính); sort=view theo lượt xem', async () => {
    const { id, token: owner } = await publishedStore();
    const viewer = await tokenOf(t, await createUser(t, { fee: 'active' }));
    expect((await cardOf(viewer, id))?.views).toBe(0);
    await t.call(`/stores/${id}`, { token: viewer });
    await t.call(`/stores/${id}`, { token: viewer });
    await t.call(`/stores/${id}`, { token: owner });
    expect((await cardOf(viewer, id))?.views).toBe(2);
    const byView = storeListSchema.parse(
      await (await t.call('/stores?sort=view', { token: viewer })).json(),
    );
    const views = byView.items.map((x) => x.views);
    expect(views).toEqual([...views].sort((a, b) => b - a));
  });

  it('tim yêu thích theo từng người, idempotent; gian hàng không hiển thị → 404', async () => {
    const { id } = await publishedStore();
    const a = await tokenOf(t, await createUser(t, { fee: 'active' }));
    const b = await tokenOf(t, await createUser(t, { fee: 'active' }));
    const fav = (token: string, on: boolean, sid = id) =>
      t.call(`/stores/${sid}/favorite`, { method: 'PUT', token, json: { on } });
    expect(storeFavoriteResultSchema.parse(await (await fav(a, true)).json())).toEqual({
      fav: true,
    });
    expect((await fav(a, true)).status).toBe(200);
    expect(await t.prisma.db.storeFavorite.count({ where: { storeId: id } })).toBe(1);
    expect((await cardOf(a, id))?.fav).toBe(true);
    expect((await cardOf(b, id))?.fav).toBe(false);
    const detail = storeDetailSchema.parse(
      await (await t.call(`/stores/${id}`, { token: a })).json(),
    );
    expect(detail.fav).toBe(true);
    await fav(a, false);
    expect((await cardOf(a, id))?.fav).toBe(false);
    expect((await fav(a, true, 'khong-ton-tai')).status).toBe(404);
  });

  it('Admin gắn / gỡ "Nổi bật" → thẻ Khám phá đổi, ghi audit; thiếu quyền 403', async () => {
    const { id } = await publishedStore();
    const member = await tokenOf(t, await createUser(t, { fee: 'active' }));
    const put = (token: string, featured: boolean) =>
      t.call(`/admin/stores/${id}/featured`, { method: 'PUT', token, json: { featured } });
    expect((await put(member, true)).status).toBe(403);
    const on = adminStoreSchema.parse(await (await put(admin, true)).json());
    expect(on.featured).toBe(true);
    expect((await cardOf(member, id))?.featured).toBe(true);
    // Gắn lại khi đã gắn: không đổi, không ghi thêm audit
    await put(admin, true);
    expect(
      await t.prisma.db.auditLog.count({ where: { action: 'store.feature', entityId: id } }),
    ).toBe(1);
    const off = adminStoreSchema.parse(await (await put(admin, false)).json());
    expect(off.featured).toBe(false);
    expect((await cardOf(member, id))?.featured).toBe(false);
    expect(
      await t.prisma.db.auditLog.count({ where: { action: 'store.unfeature', entityId: id } }),
    ).toBe(1);
  });
});
