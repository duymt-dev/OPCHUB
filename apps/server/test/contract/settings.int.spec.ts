import { publicSettingsSchema, publicStatsSchema } from '@opchub/shared/api';
import {
  adminAccountListSchema,
  adminCategorySchema,
  adminRoleListSchema,
  generalSettingsSchema,
  languageSettingsSchema,
  securitySettingsSchema,
} from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppSettingsService } from '@/modules/settings';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { ep } from './harness';

const items = <T extends z.ZodType>(s: T) => z.object({ items: z.array(s) });
const idSchema = z.object({ id: z.string() });
const CAT_PREFIX = 'Lĩnh vực hợp đồng';

/**
 * Contract `settings` (19) — schema đúng như apps/admin/src/features/settings/api.ts và
 * apps/portal (publicSettingsSchema); `/public/stats` dùng schema controller (publicStatsSchema).
 * Cài đặt là trạng thái TOÀN CỤC dùng chung với lane khác: mọi lệnh ghi gửi lại đúng giá trị
 * vừa đọc (không đổi hiệu lực), afterAll vẫn khôi phục snapshot app_settings + xoá cache.
 */
describe('Contract: settings', () => {
  let t: TestApp;
  let owner: string;
  let snapshot: { key: string; value: unknown }[];
  const emails: string[] = [];
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    snapshot = await t.prisma.db.appSetting.findMany({ select: { key: true, value: true } });
    // Super Admin có đủ 25 khoá (settings.general, settings.admins…)
    owner = await tokenOf(t, await createUser(t, { systemRole: 'super_admin' }));
  });
  afterAll(async () => {
    for (const s of snapshot) {
      await t.prisma.db.appSetting.update({
        where: { key: s.key },
        data: { value: s.value as never },
      });
    }
    const cache = t.app.get(AppSettingsService);
    await Promise.all(
      (['general', 'security', 'languages'] as const).map((k) => cache.invalidate(k)),
    );
    await t.prisma.db.category.deleteMany({ where: { name: { startsWith: CAT_PREFIX } } });
    await t.prisma.db.user.deleteMany({ where: { email: { in: emails } } });
    await t.close();
  });

  it('cài đặt chung / ngôn ngữ / bảo mật: đọc rồi ghi lại đúng giá trị', async () => {
    const g = await ep(
      t,
      'GET',
      '/admin/settings/general',
      '/admin/settings/general',
      generalSettingsSchema,
      { token: owner },
    );
    const g2 = await ep(
      t,
      'PATCH',
      '/admin/settings/general',
      '/admin/settings/general',
      generalSettingsSchema,
      { token: owner, json: g.data },
    );
    expect(g2.data).toEqual(g.data);

    const l = await ep(
      t,
      'GET',
      '/admin/settings/languages',
      '/admin/settings/languages',
      languageSettingsSchema,
      { token: owner },
    );
    await ep(
      t,
      'PATCH',
      '/admin/settings/languages',
      '/admin/settings/languages',
      languageSettingsSchema,
      { token: owner, json: { defaultLocale: l.data.defaultLocale } },
    );

    const s = await ep(
      t,
      'GET',
      '/admin/settings/security',
      '/admin/settings/security',
      securitySettingsSchema,
      { token: owner },
    );
    const { minPasswordLength, sessionDays, requireAdmin2fa, lockoutEnabled } = s.data;
    const s2 = await ep(
      t,
      'PATCH',
      '/admin/settings/security',
      '/admin/settings/security',
      securitySettingsSchema,
      { token: owner, json: { minPasswordLength, sessionDays, requireAdmin2fa, lockoutEnabled } },
    );
    expect(s2.data).toMatchObject({ minPasswordLength, sessionDays, requireAdmin2fa });
  });

  it('công khai: cấu hình + số liệu màn Auth', async () => {
    await ep(t, 'GET', '/public/settings', '/public/settings', publicSettingsSchema);
    await ep(t, 'GET', '/public/stats', '/public/stats', publicStatsSchema);
  });

  it('phân quyền §21: đọc vai trò rồi ghi lại ma trận y nguyên (không đổi hiệu lực)', async () => {
    const cur = await ep(
      t,
      'GET',
      '/admin/admin-roles',
      '/admin/admin-roles',
      adminRoleListSchema,
      {
        token: owner,
      },
    );
    // Reused test databases can hold >50 fixture roles; the write contract is a bounded batch.
    const matrix = Object.fromEntries(
      cur.data.items
        .filter((r) => r.key !== 'super_admin')
        .slice(0, 50)
        .map((r) => [r.id, r.permissions]),
    );
    expect(Object.keys(matrix).length).toBeGreaterThan(0);
    expect(Object.keys(matrix).length).toBeLessThanOrEqual(50);
    const put = await ep(
      t,
      'PUT',
      '/admin/admin-roles/permissions',
      '/admin/admin-roles/permissions',
      adminRoleListSchema,
      { token: owner, json: matrix },
    );
    expect(put.data).toEqual(cur.data);
  });

  it('tài khoản quản trị §21: liệt kê', async () => {
    await ep(t, 'GET', '/admin/admin-accounts', '/admin/admin-accounts', adminAccountListSchema, {
      token: owner,
    });
  });

  it('lĩnh vực: thêm, sửa, ẩn, sắp xếp (giữ nguyên thứ tự), xoá', async () => {
    const name = `${CAT_PREFIX} ${randomUUID().slice(0, 6)}`;
    const c = await ep(t, 'POST', '/admin/categories', '/admin/categories', adminCategorySchema, {
      token: owner,
      json: { name, color: '#13C2C2', scope: ['project'] },
    });
    const id = c.data.id;
    const put = await ep(
      t,
      'PUT',
      '/admin/categories/:id',
      `/admin/categories/${id}`,
      adminCategorySchema,
      { token: owner, json: { name, color: '#2F54EB', scope: ['project', 'biz'], enabled: true } },
    );
    expect(put.data.color).toBe('#2F54EB');
    const hid = await ep(
      t,
      'PATCH',
      '/admin/categories/:id',
      `/admin/categories/${id}`,
      adminCategorySchema,
      { token: owner, json: { enabled: false } },
    );
    expect(hid.data.enabled).toBe(false);
    const list = await ep(
      t,
      'GET',
      '/admin/categories',
      '/admin/categories',
      items(adminCategorySchema),
      { token: owner },
    );
    // Gửi lại đúng thứ tự hiện có → không xáo trộn lĩnh vực của lane khác
    const ids = list.data.items.map((i) => i.id);
    const ord = await ep(
      t,
      'PUT',
      '/admin/categories/order',
      '/admin/categories/order',
      z.array(adminCategorySchema),
      { token: owner, json: { ids } },
    );
    expect(ord.data.map((i) => i.id)).toEqual(ids);
    await ep(t, 'DELETE', '/admin/categories/:id', `/admin/categories/${id}`, idSchema, {
      token: owner,
    });
  });
});
