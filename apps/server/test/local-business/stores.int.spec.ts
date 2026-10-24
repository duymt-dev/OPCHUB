import { planAmount } from '@opchub/shared';
import {
  adminStoreListSchema,
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

const NOW = new Date('2026-10-24T03:00:00Z');
const INTRO = 'Thu mua và chế biến tôm khô, mực khô từ ngư dân Sông Đốc, đạt OCOP 4 sao.';

const FULL: StoreUpsert = {
  name: 'Thủy sản thử',
  slogan: 'Tôm, mực khô đặc sản',
  audience: 'business',
  field: 'Thủy sản',
  province: 'Cà Mau',
  intro: INTRO,
  coverUrl: null,
  phone: '+84 290 385 1122',
  email: 'thuysan@test.opchub.vn',
  website: 'thuysan.vn',
  address: 'Xã Sông Đốc, Cà Mau',
  items: [
    { kind: 'product', name: 'Tôm khô loại 1', price: 450000, description: '', imageUrl: null },
  ],
};

/**
 * TIP-V4-608 (REQ-510, D-75, D-84, AD-07): tự tạo gian hàng khi DN đóng phí → sửa → xuất bản
 * (không duyệt) → khám phá + lọc → Admin ẩn / hiện (audit).
 */
describe('Gian hàng địa phương (TIP-V4-608)', () => {
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

  /** TK DN đóng phí lần đầu (đường thật `MembershipFeeService.activate`) → consumer tự tạo */
  async function paidBusiness() {
    const u = await createUser(t, { accountType: 'business', fee: 'pending_payment' });
    const p = await confirmFee(t, u.id, NOW, planAmount('business'));
    await t.app.get(StoreAutoCreateHandler).onFeeConfirmed(p);
    return { u, p, token: await tokenOf(t, u) };
  }
  const mine = (token: string) => t.call('/me/store', { token });
  const save = (token: string, json: StoreUpsert) =>
    t.call('/me/store', { method: 'PUT', token, json });
  const publish = (token: string) => t.call('/me/store/publish', { method: 'POST', token });

  it('UP-03 / D-84: DN đóng phí → 1 gian hàng nháp, chạy lại không tạo thêm; Cá nhân không có', async () => {
    const { u, p, token } = await paidBusiness();
    await t.app.get(StoreAutoCreateHandler).onFeeConfirmed(p);
    expect(await t.prisma.db.store.count({ where: { ownerId: u.id } })).toBe(1);
    const res = await mine(token);
    expect(res.status).toBe(200);
    const s = storeDetailSchema.parse(await res.json());
    expect(s).toMatchObject({ status: 'draft', audience: 'business', isMine: true, items: [] });

    const per = await createUser(t, { fee: 'pending_payment' });
    const pp = await confirmFee(t, per.id, NOW);
    await t.app.get(StoreAutoCreateHandler).onFeeConfirmed(pp);
    expect(await t.prisma.db.store.count({ where: { ownerId: per.id } })).toBe(0);
    expect((await mine(await tokenOf(t, per))).status).toBe(403);
  });

  it('xuất bản cần đủ tên / giới thiệu ≥ 40 / ≥ 1 SP; đủ → hiện ngay ở Khám phá, không duyệt', async () => {
    const { token } = await paidBusiness();
    const bad = await publish(token);
    expect(bad.status).toBe(400);
    expect(JSON.stringify(await bad.json())).toContain('ít nhất 1 sản phẩm / dịch vụ');

    expect((await save(token, { ...FULL, field: 'Không có' })).status).toBe(400);
    const saved = storeDetailSchema.parse(await (await save(token, FULL)).json());
    expect(saved).toMatchObject({ status: 'draft', itemCount: 1, field: 'Thủy sản' });

    // Bản nháp: người khác không mở được
    const viewer = await tokenOf(t, await createUser(t, { fee: 'active' }));
    expect((await t.call(`/stores/${saved.id}`, { token: viewer })).status).toBe(404);

    const pub = storeDetailSchema.parse(await (await publish(token)).json());
    expect(pub.status).toBe('published');
    const list = storeListSchema.parse(
      await (
        await t.call(
          '/stores?field=Th%E1%BB%A7y%20s%E1%BA%A3n&province=C%C3%A0%20Mau&kind=product',
          {
            token: viewer,
          },
        )
      ).json(),
    );
    expect(list.items.map((x) => x.id)).toContain(saved.id);
    expect(list.facets.field.find((f) => f.value === 'Thủy sản')?.count).toBeGreaterThan(0);
    const svc = storeListSchema.parse(
      await (
        await t.call(`/stores?kind=service&q=${encodeURIComponent(FULL.name)}`, { token: viewer })
      ).json(),
    );
    expect(svc.items.map((x) => x.id)).not.toContain(saved.id);
    const detail = storeDetailSchema.parse(
      await (await t.call(`/stores/${saved.id}`, { token: viewer })).json(),
    );
    expect(detail).toMatchObject({ isMine: false, phone: FULL.phone, email: FULL.email });
  });

  it('AD-07: Admin ẩn hàng loạt → biến mất phía User, audit; hiện lại về trạng thái trước; thiếu quyền 403', async () => {
    const a = await paidBusiness();
    const b = await paidBusiness();
    await save(a.token, FULL);
    await publish(a.token);
    const ida = (await t.prisma.db.store.findUniqueOrThrow({ where: { ownerId: a.u.id } })).id;
    const idb = (await t.prisma.db.store.findUniqueOrThrow({ where: { ownerId: b.u.id } })).id;

    const member = await tokenOf(t, await createUser(t, { fee: 'active' }));
    expect(
      (await t.call('/admin/stores/hide', { method: 'POST', token: member, json: { ids: [ida] } }))
        .status,
    ).toBe(403);

    const hid = await t.call('/admin/stores/hide', {
      method: 'POST',
      token: admin,
      json: { ids: [ida, idb], reason: 'Vi phạm' },
    });
    expect(await hid.json()).toEqual({ changed: 2 });
    expect(
      await t.prisma.db.auditLog.count({
        where: { action: 'store.hide', entityId: { in: [ida, idb] } },
      }),
    ).toBe(2);
    expect((await t.call(`/stores/${ida}`, { token: member })).status).toBe(404);
    // Chủ vẫn xem được nhưng không xuất bản được khi bị ẩn
    expect((await publish(b.token)).status).toBe(409);

    const list = adminStoreListSchema.parse(
      await (await t.call('/admin/stores?status=hidden', { token: admin })).json(),
    );
    expect(list.items.map((x) => x.id)).toEqual(expect.arrayContaining([ida, idb]));

    await t.call('/admin/stores/show', { method: 'POST', token: admin, json: { ids: [ida, idb] } });
    const rows = await t.prisma.db.store.findMany({
      where: { id: { in: [ida, idb] } },
      select: { id: true, status: true, hiddenPrev: true },
    });
    expect(Object.fromEntries(rows.map((r) => [r.id, [r.status, r.hiddenPrev]]))).toEqual({
      [ida]: ['published', null],
      [idb]: ['draft', null],
    });
  });

  it('chủ hết hạn phí → gian hàng rời Khám phá; về nháp ẩn khỏi Khám phá', async () => {
    const { u, token } = await paidBusiness();
    await save(token, FULL);
    const s = storeDetailSchema.parse(await (await publish(token)).json());
    const viewer = await tokenOf(t, await createUser(t, { fee: 'active' }));
    const has = async () =>
      storeListSchema
        .parse(
          await (
            await t.call(`/stores?q=${encodeURIComponent(FULL.name)}`, { token: viewer })
          ).json(),
        )
        .items.some((x) => x.id === s.id);
    await t.redis.client.del('stores:facets');
    expect(await has()).toBe(true);
    await t.call('/me/store/unpublish', { method: 'POST', token });
    expect(await has()).toBe(false);
    await publish(token);
    await t.prisma.db.membershipFee.update({
      where: { userId: u.id },
      data: { status: 'expired', validUntil: new Date(Date.now() - 1000) },
    });
    expect(await has()).toBe(false);
  });
});
