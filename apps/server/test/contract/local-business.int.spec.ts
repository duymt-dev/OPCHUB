import { planAmount } from '../factories/prices';
import {
  adminNeedListSchema,
  adminStoreListSchema,
  adminStoreModerateResultSchema,
  adminStoreSchema,
  myNeedsSchema,
  needListSchema,
  needSchema,
  storeDetailSchema,
  storeListSchema,
} from '@opchub/shared/api-domains';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { StoreAutoCreateHandler } from '@/modules/local-business';
import { confirmFee } from '../factories/affiliate.factory';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { ep } from './harness';

/**
 * Contract Gian hàng (V4-608, 10) + Nhu cầu (V4-609, 8) — schema đúng như apps/portal/src/features/stores/api.ts và
 * apps/admin/src/features/stores/api.ts.
 */
describe('Contract: local-business · Gian hàng', () => {
  let t: TestApp;
  let admin: string;
  let owner: string;
  let ownerId: string;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    const u = await createUser(t, { accountType: 'business', fee: 'pending_payment' });
    const p = await confirmFee(t, u.id, new Date(), planAmount('business'));
    await t.app.get(StoreAutoCreateHandler).onFeeConfirmed(p);
    owner = await tokenOf(t, u);
    ownerId = u.id;
  });
  afterAll(async () => {
    await t.prisma.db.need.deleteMany({ where: { ownerId } });
    await t.prisma.db.store.deleteMany({ where: { ownerId } });
    await t.close();
  });

  it('chủ sửa → xuất bản → khám phá → Admin ẩn / hiện', async () => {
    const mine = await ep(t, 'GET', '/me/store', '/me/store', storeDetailSchema, { token: owner });
    const json = {
      name: 'Gian hàng hợp đồng',
      slogan: '',
      audience: 'business',
      field: 'Thủy sản',
      province: 'Cà Mau',
      intro: 'Giới thiệu đủ bốn mươi ký tự để xuất bản gian hàng thử nghiệm.',
      coverUrl: null,
      phone: '',
      email: '',
      website: '',
      address: '',
      items: [{ kind: 'service', name: 'Dịch vụ', price: null, description: '', imageUrl: null }],
    };
    await ep(t, 'PUT', '/me/store', '/me/store', storeDetailSchema, { token: owner, json });
    await ep(t, 'POST', '/me/store/publish', '/me/store/publish', storeDetailSchema, {
      token: owner,
    });
    await ep(t, 'GET', '/stores', '/stores?kind=service', storeListSchema, { token: owner });
    await ep(t, 'GET', '/stores/:id', `/stores/${mine.data.id}`, storeDetailSchema, {
      token: owner,
    });
    await ep(t, 'POST', '/me/store/unpublish', '/me/store/unpublish', storeDetailSchema, {
      token: owner,
    });
    await ep(t, 'GET', '/admin/stores', '/admin/stores?status=draft', adminStoreListSchema, {
      token: admin,
    });
    await ep(t, 'GET', '/admin/stores/:id', `/admin/stores/${mine.data.id}`, adminStoreSchema, {
      token: admin,
    });
    const ids = { ids: [mine.data.id] };
    await ep(
      t,
      'POST',
      '/admin/stores/hide',
      '/admin/stores/hide',
      adminStoreModerateResultSchema,
      {
        token: admin,
        json: ids,
      },
    );
    await ep(
      t,
      'POST',
      '/admin/stores/show',
      '/admin/stores/show',
      adminStoreModerateResultSchema,
      {
        token: admin,
        json: ids,
      },
    );
  });

  it('Nhu cầu: chủ đăng → danh sách → đóng / mở lại → Admin ẩn / hiện → xoá', async () => {
    const json = {
      type: 'buy',
      title: 'Cần 100 kg tôm khô',
      field: 'Thủy sản',
      description: 'Mô tả nhu cầu đủ dài để hợp lệ theo prototype.',
      province: 'Cà Mau',
      phone: '0912345678',
    };
    const n = await ep(t, 'POST', '/me/needs', '/me/needs', needSchema, { token: owner, json });
    await ep(t, 'GET', '/me/needs', '/me/needs', myNeedsSchema, { token: owner });
    await ep(t, 'GET', '/needs', '/needs?type=buy', needListSchema, { token: owner });
    const step = (action: string) =>
      ep(t, 'PATCH', '/me/needs/:id', `/me/needs/${n.data.id}`, needSchema, {
        token: owner,
        json: { action },
      });
    await step('close');
    await step('reopen');
    await ep(t, 'GET', '/admin/needs', '/admin/needs?status=open', adminNeedListSchema, {
      token: admin,
    });
    const ids = { ids: [n.data.id] };
    await ep(t, 'POST', '/admin/needs/hide', '/admin/needs/hide', adminStoreModerateResultSchema, {
      token: admin,
      json: ids,
    });
    await ep(t, 'POST', '/admin/needs/show', '/admin/needs/show', adminStoreModerateResultSchema, {
      token: admin,
      json: ids,
    });
    await ep(t, 'DELETE', '/me/needs/:id', `/me/needs/${n.data.id}`, null, { token: owner }, 204);
  });
});
