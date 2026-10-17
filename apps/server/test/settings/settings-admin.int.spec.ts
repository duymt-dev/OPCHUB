import {
  adminCategorySchema,
  generalSettingsSchema,
  languageSettingsSchema,
  securitySettingsSchema,
} from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppSettingsService } from '@/modules/settings';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const errorOf = async (r: Response) => ((await r.json()) as { error: { message: string } }).error;

describe('Admin Cài đặt (B40)', () => {
  let t: TestApp;
  let admin: string;
  let snapshot: { key: string; value: unknown }[];
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    snapshot = await t.prisma.db.appSetting.findMany({ select: { key: true, value: true } });
  });
  beforeEach(async () => {
    await flushAuthState(t);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
  });
  afterAll(async () => {
    // Trả cấu hình về như seed để test khác không lệch
    for (const s of snapshot) {
      await t.prisma.db.appSetting.update({
        where: { key: s.key },
        data: { value: s.value as never },
      });
    }
    const cache = t.app.get(AppSettingsService);
    await Promise.all(
      ['general', 'security', 'languages'].map((k) => cache.invalidate(k as 'general')),
    );
    await t.prisma.db.category.deleteMany({ where: { name: { startsWith: 'Lĩnh vực thử' } } });
    await t.close();
  });

  const patch = (path: string, json: unknown) =>
    t.call(`/admin/settings/${path}`, { method: 'PATCH', token: admin, json });

  it('chung: lưu → đọc lại → audit "cập nhật cài đặt chung"', async () => {
    const r = await patch('general', { platformName: 'OPC Hub ASEAN', openRegistration: false });
    expect(generalSettingsSchema.parse(await r.json())).toMatchObject({
      platformName: 'OPC Hub ASEAN',
      openRegistration: false,
    });
    const again = generalSettingsSchema.parse(
      await (await t.call('/admin/settings/general', { token: admin })).json(),
    );
    expect(again.openRegistration).toBe(false);
    const log = await t.prisma.db.auditLog.findFirst({
      where: { action: 'settings.general' },
      orderBy: { createdAt: 'desc' },
      select: { summary: true, tag: true },
    });
    expect(log).toEqual({ summary: 'cập nhật cài đặt chung', tag: 'settings' });
  });

  it('bảo mật: tắt SSO → audit sso; chính sách → lưu; userCount tính từ auth_identities', async () => {
    const off = securitySettingsSchema.parse(
      await (await patch('security', { provider: { id: 'deepseek', enabled: false } })).json(),
    );
    expect(off.providers.find((p) => p.id === 'deepseek')?.enabled).toBe(false);
    expect(off.providers.every((p) => p.userCount >= 0)).toBe(true);
    const pol = securitySettingsSchema.parse(
      await (await patch('security', { minPasswordLength: 12, lockoutEnabled: false })).json(),
    );
    expect(pol).toMatchObject({ minPasswordLength: 12, lockoutEnabled: false });
    const sso = await t.prisma.db.auditLog.findFirst({
      where: { action: 'sso.toggle' },
      orderBy: { createdAt: 'desc' },
      select: { summary: true },
    });
    expect(sso?.summary).toBe('tắt đăng nhập bằng DeepSeek');
  });

  it('ngôn ngữ: tắt mặc định → 409; đổi mặc định → tắt được; progress có', async () => {
    const cur = languageSettingsSchema.parse(
      await (await t.call('/admin/settings/languages', { token: admin })).json(),
    );
    expect(cur.items.find((i) => i.code === 'vi')?.progress).toBe(100);
    const def = cur.defaultLocale;
    const bad = await patch('languages', { toggle: { code: def, enabled: false } });
    expect(bad.status).toBe(409);
    expect((await errorOf(bad)).message).toBe('Không thể tắt ngôn ngữ mặc định');
    expect((await patch('languages', { toggle: { code: 'zz', enabled: true } })).status).toBe(404);
    await patch('languages', { defaultLocale: 'en' });
    const ok = languageSettingsSchema.parse(
      await (await patch('languages', { toggle: { code: def, enabled: false } })).json(),
    );
    expect(ok.items.find((i) => i.code === def)?.enabled).toBe(false);
  });

  it('lĩnh vực: thêm 201, trùng (không phân biệt hoa thường) 409, ẩn, sắp xếp, xoá; đang dùng 409', async () => {
    const name = `Lĩnh vực thử ${randomUUID().slice(0, 6)}`;
    const c = await t.call('/admin/categories', {
      method: 'POST',
      token: admin,
      json: { name, color: '#13C2C2', scope: ['project'] },
    });
    expect(c.status).toBe(201);
    const cat = adminCategorySchema.parse(await c.json());
    expect(cat).toMatchObject({ enabled: true, projectCount: 0, bizCount: 0 });
    const dup = await t.call('/admin/categories', {
      method: 'POST',
      token: admin,
      json: { name: name.toUpperCase(), color: '#13C2C2', scope: ['project'] },
    });
    expect((await errorOf(dup)).message).toBe('Lĩnh vực đã tồn tại');
    const hid = adminCategorySchema.parse(
      await (
        await t.call(`/admin/categories/${cat.id}`, {
          method: 'PATCH',
          token: admin,
          json: { enabled: false },
        })
      ).json(),
    );
    expect(hid.enabled).toBe(false);

    const list = (await (await t.call('/admin/categories', { token: admin })).json()) as {
      items: { id: string }[];
    };
    const ids = list.items.map((i) => i.id);
    const reordered = [cat.id, ...ids.filter((i) => i !== cat.id)];
    const ord = await t.call('/admin/categories/order', {
      method: 'PUT',
      token: admin,
      json: { ids: reordered },
    });
    expect(((await ord.json()) as { id: string }[])[0]?.id).toBe(cat.id);
    const stale = await t.call('/admin/categories/order', {
      method: 'PUT',
      token: admin,
      json: { ids: reordered.slice(1) },
    });
    expect(stale.status).toBe(409);

    expect(
      (await t.call(`/admin/categories/${cat.id}`, { method: 'DELETE', token: admin })).status,
    ).toBe(200);
    // Lĩnh vực có dự án (BR-11)
    const used = await t.prisma.db.project.findFirst({
      where: { deletedAt: null, categoryId: { not: null } },
      select: { categoryId: true },
    });
    if (used?.categoryId) {
      const del = await t.call(`/admin/categories/${used.categoryId}`, {
        method: 'DELETE',
        token: admin,
      });
      expect((await errorOf(del)).message).toBe('Lĩnh vực đang được sử dụng – hãy ẩn thay vì xoá');
    }
  });

  it('điều phối viên không vào được Cài đặt (403)', async () => {
    const mod = await tokenOf(t, await createUser(t, { systemRole: 'moderator' }));
    expect((await t.call('/admin/settings/general', { token: mod })).status).toBe(403);
  });
});
