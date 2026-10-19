import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { DiscoveryModule, DiscoveryService, Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import {
  type AdminPermissionKey,
  ADMIN_SYSTEM_ROLES,
  type AdminSystemRoleKey,
  DEFAULT_ADMIN_ROLE_PERMISSIONS,
  effectiveAdminGrants,
  viewKeyOf,
} from '@opchub/shared';
import { apiErrorSchema } from '@opchub/shared/api';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  type AccessClaimsInput,
  AccessTokenService,
  accessClaimsSchema,
  META,
  PermissionCheck,
  PermissionGuard,
} from '@/common/auth';
import { AppError } from '@/common/errors';
import { RoleGrantsService } from '@/modules/admin-account';
import { createTestApp } from '../setup/test-app';
import { roleIds } from './helpers';

/**
 * REQ-325 (TIP-V2-203): ma trận route `/v1/admin/**` × 5 vai trò mặc định (§21.2), sinh từ metadata Nest
 * (DiscoveryService) — không liệt kê tay. Kỳ vọng theo RB-R07: đủ khoá → qua; thiếu khoá thao tác mà có
 * khoá Xem của menu → 403 `VIEW_ONLY`; còn lại 403 `FORBIDDEN`. Ca bị chặn gọi HTTP thật (handler không
 * chạy); ca được phép: GET gọi HTTP (≠ 401/403), route ghi chỉ chạy guard (không tạo dữ liệu).
 */
type Outcome = 'ALLOW' | 'VIEW_ONLY' | 'FORBIDDEN';
interface AdminRoute {
  method: string;
  path: string;
  url: string;
  keys: readonly AdminPermissionKey[];
  any: readonly AdminPermissionKey[];
  controller: new (...args: never[]) => unknown;
  handler: (...args: unknown[]) => unknown;
}

const t = await createTestApp({ imports: [DiscoveryModule] });
const reflector = t.app.get(Reflector);

const join = (...parts: string[]) =>
  `/${parts
    .flatMap((p) => p.split('/'))
    .filter(Boolean)
    .join('/')}`;
const first = (v: unknown): string =>
  typeof v === 'string' ? v : Array.isArray(v) && typeof v[0] === 'string' ? v[0] : '';

function adminRoutes(): AdminRoute[] {
  const out: AdminRoute[] = [];
  for (const w of t.app.get(DiscoveryService).getControllers()) {
    const ctrl = w.metatype as AdminRoute['controller'] | null;
    if (!ctrl || typeof ctrl !== 'function') continue;
    const base = first(Reflect.getMetadata(PATH_METADATA, ctrl));
    const proto = ctrl.prototype as Record<string, unknown>;
    for (const name of Object.getOwnPropertyNames(proto)) {
      const handler = proto[name];
      if (name === 'constructor' || typeof handler !== 'function') continue;
      const sub = Reflect.getMetadata(PATH_METADATA, handler) as unknown;
      if (sub === undefined) continue;
      const path = join('v1', base, first(sub));
      if (!path.startsWith('/v1/admin/') || path.startsWith('/v1/admin/auth/')) continue;
      const method = RequestMethod[Reflect.getMetadata(METHOD_METADATA, handler) as number];
      const metaOf = (key: string) =>
        reflector.getAllAndOverride<AdminPermissionKey[]>(key, [handler, ctrl]) ?? [];
      out.push({
        method: method ?? '',
        path,
        url: path.slice('/v1'.length).replace(/:\w+/g, () => `rbac-${randomUUID()}`),
        keys: metaOf(META.adminPermissions),
        any: metaOf(META.adminAny),
        controller: ctrl,
        handler: handler as AdminRoute['handler'],
      });
    }
  }
  return out.sort((a, b) => `${a.path} ${a.method}`.localeCompare(`${b.path} ${b.method}`));
}

const ROUTES = adminRoutes();
const ROLES = ADMIN_SYSTEM_ROLES.map((r) => ({
  ...r,
  grants: effectiveAdminGrants(
    r.key,
    r.key === 'super_admin' ? [] : DEFAULT_ADMIN_ROLE_PERMISSIONS[r.key],
  ),
}));

/** RB-R07 */
function expected(route: AdminRoute, grants: readonly AdminPermissionKey[]): Outcome {
  if (route.any.length && !route.any.some((k) => grants.includes(k))) return 'FORBIDDEN';
  const missing = route.keys.find((k) => !grants.includes(k));
  if (!missing) return 'ALLOW';
  const view = viewKeyOf(missing);
  return view && grants.includes(view) ? 'VIEW_ONLY' : 'FORBIDDEN';
}

describe('Ma trận quyền route /admin × vai trò (TIP-V2-203, REQ-325, RB-R07)', () => {
  const tokens = new Map<AdminSystemRoleKey, { tk: string; claims: AccessClaimsInput }>();
  let guard: PermissionGuard;

  beforeAll(async () => {
    const ids = await roleIds(t);
    // Ma trận mặc định §21.2 (test khác có thể đã đổi rồi khôi phục) — ghi Redis như sau khi lưu
    await t.app.get(RoleGrantsService).reloadAll();
    for (const r of ROLES) {
      const roleId = ids[r.key] ?? '';
      const stored = await t.app.get(RoleGrantsService).grantsOf(roleId);
      expect([...stored].sort(), `ma trận DB của ${r.name} phải là mặc định`).toEqual(
        [...r.grants].sort(),
      );
      const claims: AccessClaimsInput = {
        sub: `rbac-${r.key}-${randomUUID()}`,
        accountType: 'personal',
        systemRole: 'admin',
        permVersion: 1,
        membershipFee: null,
        mustChangePassword: false,
        realm: 'admin',
        roleId,
        roleName: r.name,
      };
      tokens.set(r.key, { tk: await t.app.get(AccessTokenService).sign(claims), claims });
    }
    guard = new PermissionGuard(reflector, t.app.get(PermissionCheck));
  });
  afterAll(async () => {
    await t.close();
  });

  it('REQ-325 mọi route /admin có khoá (@RequireAdmin / @RequireAnyAdmin), khoá hợp lệ', () => {
    expect(ROUTES.length).toBeGreaterThan(100);
    const bare = ROUTES.filter((r) => !r.keys.length && !r.any.length);
    expect(bare.map((r) => `${r.method} ${r.path}`)).toEqual([]);
  });

  /** Chạy riêng PermissionGuard với metadata thật của handler */
  const runGuard = async (route: AdminRoute, claims: AccessClaimsInput): Promise<Outcome> => {
    const req = { user: accessClaimsSchema.parse(claims) };
    const ctx = new ExecutionContextHost(
      [req, {}, () => undefined],
      route.controller,
      route.handler,
    );
    try {
      await guard.canActivate(ctx);
      return 'ALLOW';
    } catch (e) {
      if (e instanceof AppError && (e.code === 'VIEW_ONLY' || e.code === 'FORBIDDEN'))
        return e.code;
      throw e;
    }
  };

  for (const route of ROUTES) {
    for (const role of ROLES) {
      const want = expected(route, role.grants);
      it(`REQ-325 ${route.method} ${route.path} × ${role.name} → ${want}`, async () => {
        const s = tokens.get(role.key);
        if (!s) throw new Error('thiếu token');
        expect(await runGuard(route, s.claims)).toBe(want);
        if (want === 'ALLOW' && route.method !== 'GET') return;
        const r = await t.call(route.url, {
          method: route.method,
          token: s.tk,
          ...(route.method === 'GET' || route.method === 'DELETE' ? {} : { json: {} }),
        });
        if (want === 'ALLOW') {
          expect([401, 403]).not.toContain(r.status);
          return;
        }
        expect(r.status).toBe(403);
        const err = apiErrorSchema.parse(await r.json()).error;
        expect(err.code).toBe(want);
        if (want === 'VIEW_ONLY') {
          expect(err.message).toBe(`Vai trò ${role.name} chỉ có quyền xem mục này`);
        }
      });
    }
  }

  it('AT-RB03 Giảng viên khoá/xuất thành viên → VIEW_ONLY', async () => {
    const s = tokens.get('lecturer');
    if (!s) throw new Error('thiếu token');
    expect((await t.call('/admin/users', { token: s.tk })).status).toBe(200);
    for (const [method, url] of [
      ['PATCH', `/admin/users/${randomUUID()}/status`],
      ['POST', '/admin/users/export'],
    ] as const) {
      const r = await t.call(url, { method, token: s.tk, json: {} });
      expect(r.status).toBe(403);
      expect(apiErrorSchema.parse(await r.json()).error).toMatchObject({
        code: 'VIEW_ONLY',
        message: 'Vai trò Giảng viên chỉ có quyền xem mục này',
      });
    }
    // RB-R06: Giảng viên không có quyền xem Phí
    const fees = await t.call('/admin/fees', { token: s.tk });
    expect(fees.status).toBe(403);
    expect(apiErrorSchema.parse(await fees.json()).error.code).toBe('FORBIDDEN');
  });

  it('AT-RB02 Kế toán: xem tổng quan/thành viên/phí/dịch vụ, thao tác phí, nhật ký; còn lại 403', async () => {
    const s = tokens.get('accountant');
    if (!s) throw new Error('thiếu token');
    for (const url of ['/admin/overview', '/admin/users', '/admin/fees', '/admin/audit-logs']) {
      expect((await t.call(url, { token: s.tk })).status, url).toBe(200);
    }
    expect((await t.call('/admin/service-requests', { token: s.tk })).status).toBe(200);
    for (const url of ['/admin/groups', '/admin/events', '/admin/projects', '/admin/personas']) {
      expect((await t.call(url, { token: s.tk })).status, url).toBe(403);
    }
  });
});
