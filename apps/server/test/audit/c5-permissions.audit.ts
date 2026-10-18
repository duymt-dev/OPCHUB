/**
 * Kiểm 5 — Permission key → guard. Key lấy từ `ALL_PERMISSIONS` (@opchub/shared). Mỗi key phải xuất hiện
 * trong `@RequirePermission(...)` ít nhất một route. Mọi route `/v1/admin/**` phải có RequirePermission
 * (method hoặc class). Liệt kê chỗ so tên vai trò (systemRole === 'x', danh sách vai trò cứng).
 * Chạy: packages/db/node_modules/.bin/tsx apps/server/test/audit/c5-permissions.audit.ts
 */
import { ALL_PERMISSIONS } from '@opchub/shared';
import {
  type CheckResult,
  controllerRoutes,
  type Finding,
  grep,
  isMain,
  isProdTs,
  printResult,
  type Route,
  walk,
} from './lib.audit';

const permsOf = (decos: readonly string[]): string[] =>
  decos.flatMap((d) =>
    [...(d.match(/@RequirePermission\(([^)]*)\)/)?.[1]?.matchAll(/'([a-z]\.[a-z]+)'/g) ?? [])].map(
      (m) => m[1] ?? '',
    ),
  );

/** 5a. Key không dùng ở guard; trả số key đạt */
function unusedKeys(routes: readonly Route[], fail: Finding[], notes: string[]): number {
  let pass = 0;
  const usage = new Map<string, string[]>();
  for (const r of routes) {
    for (const k of new Set([...permsOf(r.deco), ...permsOf(r.classDeco)])) {
      usage.set(k, [...(usage.get(k) ?? []), `${r.method} ${r.path}`]);
    }
  }
  const server = walk('apps/server/src', isProdTs);
  for (const k of ALL_PERMISSIONS) {
    const used = usage.get(k) ?? [];
    if (used.length) {
      pass++;
      notes.push(`${k}: ${used.length} route`);
      continue;
    }
    const inService = grep(server, new RegExp(`'${k.replace('.', '\\.')}'`)).filter(
      (h) => !/RequirePermission/.test(h.text),
    );
    fail.push({
      where: 'packages/shared/src/permissions.ts',
      what: `key \`${k}\` không có trong @RequirePermission nào${inService.length ? ` (chỉ dùng trong service: ${inService.map((h) => `${h.file}:${h.line}`).join(', ')})` : ' và không nơi nào kiểm'}`,
      sev: inService.length ? 'S4' : 'S3',
    });
  }
  return pass;
}

export function runC5(): CheckResult {
  const routes = controllerRoutes();
  const fail: Finding[] = [];
  const notes: string[] = [];
  let pass = 0;

  pass += unusedKeys(routes, fail, notes);
  const server = walk('apps/server/src', isProdTs);

  // 5b. Route /v1/admin không có permission
  for (const r of routes.filter((x) => x.path.startsWith('/v1/admin'))) {
    if (permsOf(r.deco).length || permsOf(r.classDeco).length) {
      pass++;
      continue;
    }
    // Service tự kiểm ALL_PERMISSIONS.some(...) → chấp nhận nhưng ghi chú
    const svcCheck = grep(server, /ALL_PERMISSIONS\.some\(/);
    if (r.handler === 'badges' && svcCheck.length) {
      pass++;
      notes.push(
        `${r.file}:${r.line} ${r.method} ${r.path}: không decorator nhưng service kiểm "có ít nhất 1 quyền" (${svcCheck.map((h) => `${h.file}:${h.line}`).join(', ')})`,
      );
      continue;
    }
    fail.push({
      where: `${r.file}:${r.line}`,
      what: `${r.method} ${r.path} (${r.handler}) không có @RequirePermission — guard chỉ yêu cầu đăng nhập + phí`,
      sev: 'S1',
    });
  }
  // Route ngoài /admin nhưng làm việc quản trị (kiểm quyền trong service)
  const adminish = routes.filter(
    (r) =>
      /\/requests\/:userId\/:decision|\/requests$/.test(r.path) && !r.path.startsWith('/v1/admin'),
  );
  for (const r of adminish) {
    notes.push(
      `${r.file}:${r.line} ${r.method} ${r.path}: không decorator — quyền (chủ nhóm hoặc c.mod) kiểm trong service (GroupAccessService.canManage)`,
    );
  }
  const groupRole = grep(server, /@RequireGroupRole\(/);
  notes.push(
    `@RequireGroupRole dùng ở ${groupRole.length} route (decorator + GroupRoleGuard tồn tại nhưng không dùng)`,
  );

  // 5c. So tên vai trò thay vì key
  const all = walk(
    'apps',
    (f) => isProdTs(f) && /[\\/]src[\\/]/.test(f) && !/[\\/]mocks[\\/]/.test(f),
  );
  const roleCmp = grep(
    all,
    /(systemRole|\.role|role)\s*(===|!==)\s*'(super_admin|admin|moderator|member)'|\[\s*'super_admin',\s*'admin'|'super_admin'\s*\)/,
  ).filter((h) => !/z\.enum|^\s*(\*|\/\/)/.test(h.text));
  for (const h of roleCmp) {
    const fe = h.file.startsWith('apps/portal') || h.file.startsWith('apps/admin');
    const display = /label|tag|tone|demo/.test(h.text);
    fail.push({
      where: `${h.file}:${h.line}`,
      what: `so tên vai trò: \`${h.text.slice(0, 110)}\``,
      sev: display ? 'S4' : fe ? 'S4' : 'NỢ',
    });
  }
  const sqlRole = grep(server, /system_role <> 'super_admin'|systemRole: \{ not: 'super_admin' \}/);
  notes.push(
    `Lọc super_admin trong SQL (bảo vệ chủ hệ thống, không phải kiểm quyền): ${sqlRole.map((h) => `${h.file}:${h.line}`).join(', ')}`,
  );
  return { id: 5, title: 'Permission key → guard', pass, fail, notes };
}

if (isMain('c5-permissions.audit.ts')) printResult(runC5());
