/**
 * Kiểm 5 — Permission key → guard. 25 khoá §21 (`ADMIN_PERMISSION_KEYS`, TIP-V2-203). Mỗi khoá phải
 * xuất hiện trong `@RequireAdmin(...)` ít nhất một route (Affiliate: TIP-V2-402). Mọi route
 * `/v1/admin/**` phải có `@RequireAdmin` / `@RequireAnyAdmin` (method hoặc class), trừ route phiên
 * `/v1/admin/auth/**`. Liệt kê chỗ so tên vai trò (systemRole === 'x', danh sách vai trò cứng).
 * Chạy: packages/db/node_modules/.bin/tsx apps/server/test/audit/c5-permissions.audit.ts
 */
import { ADMIN_PERMISSION_KEYS } from '@opchub/shared';
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
    [...(d.match(/@RequireAdmin\(([^)]*)\)/)?.[1]?.matchAll(/'([a-z]+\.[a-z]+)'/g) ?? [])].map(
      (m) => m[1] ?? '',
    ),
  );
const anyOf = (decos: readonly string[]) => decos.some((d) => /@RequireAnyAdmin\(/.test(d));

/** Affiliate §20 thuộc Pha 4 (TIP-V2-402) — chưa có route */
const DEFERRED = new Set(['affiliate.view', 'affiliate.action', 'affiliate.payout']);

/** 5a. Khoá không dùng ở guard; trả số khoá đạt */
function unusedKeys(routes: readonly Route[], fail: Finding[], notes: string[]): number {
  let pass = 0;
  const usage = new Map<string, string[]>();
  for (const r of routes) {
    for (const k of new Set([...permsOf(r.deco), ...permsOf(r.classDeco)])) {
      usage.set(k, [...(usage.get(k) ?? []), `${r.method} ${r.path}`]);
    }
  }
  const server = walk('apps/server/src', isProdTs);
  for (const k of ADMIN_PERMISSION_KEYS) {
    const used = usage.get(k) ?? [];
    if (used.length) {
      pass++;
      notes.push(`${k}: ${used.length} route`);
      continue;
    }
    if (DEFERRED.has(k)) {
      notes.push(`${k}: chưa có route — Affiliate ở TIP-V2-402`);
      continue;
    }
    const inService = grep(server, new RegExp(`'${k.replace('.', '\\.')}'`)).filter(
      (h) => !/RequireAdmin/.test(h.text),
    );
    fail.push({
      where: 'packages/shared/src/permissions.ts',
      what: `khoá \`${k}\` không có trong @RequireAdmin nào${inService.length ? ` (chỉ dùng trong service: ${inService.map((h) => `${h.file}:${h.line}`).join(', ')})` : ' và không nơi nào kiểm'}`,
      sev: inService.length ? 'S4' : 'S3',
    });
  }
  return pass;
}

/** 5b. Route /v1/admin không có khoá */
function unguarded(routes: readonly Route[], fail: Finding[], notes: string[]): number {
  let pass = 0;
  for (const r of routes.filter((x) => x.path.startsWith('/v1/admin'))) {
    const decos = [...r.deco, ...r.classDeco];
    if (permsOf(decos).length || anyOf(decos)) {
      pass++;
      continue;
    }
    // Route phiên Admin (đăng nhập, đổi MK lần đầu, 2FA) — chỉ cần phiên realm admin
    if (r.path.startsWith('/v1/admin/auth')) {
      pass++;
      notes.push(`${r.method} ${r.path}: route phiên Admin, không cần khoá`);
      continue;
    }
    fail.push({
      where: `${r.file}:${r.line}`,
      what: `${r.method} ${r.path} (${r.handler}) không có @RequireAdmin — guard chỉ yêu cầu phiên Admin`,
      sev: 'S1',
    });
  }
  return pass;
}

/** 5c. So tên vai trò thay vì khoá */
function roleNameChecks(fail: Finding[], notes: string[]): void {
  const all = walk(
    'apps',
    (f) => isProdTs(f) && /[\\/]src[\\/]/.test(f) && !/[\\/]mocks[\\/]/.test(f),
  );
  const roleCmp = grep(
    all,
    /(systemRole|\.role|role)\s*(===|!==)\s*'(super_admin|admin|moderator|member)'|\[\s*'super_admin',\s*'admin'|'super_admin'\s*\)/,
  )
    .filter((h) => !/z\.enum|^\s*(\*|\/\/)/.test(h.text))
    // RB-R04 bảo vệ Super Admin theo khoá cố định `admin_roles.key` — ghi ở notes bên dưới
    .filter((h) => !/\.key === 'super_admin'/.test(h.text));
  for (const h of roleCmp) {
    const fe = h.file.startsWith('apps/portal') || h.file.startsWith('apps/admin');
    const display = /label|tag|tone|demo/.test(h.text);
    fail.push({
      where: `${h.file}:${h.line}`,
      what: `so tên vai trò: \`${h.text.slice(0, 110)}\``,
      sev: display ? 'S4' : fe ? 'S4' : 'NỢ',
    });
  }
  // RB-R04: Super Admin không sửa/khoá/gán được — bảo vệ chủ hệ thống, không phải kiểm quyền
  const protect = grep(
    walk('apps/server/src/modules/admin-account', isProdTs),
    /\.key === 'super_admin'/,
  );
  notes.push(
    `Bảo vệ vai trò Super Admin (RB-R04, theo admin_roles.key): ${protect.map((h) => `${h.file}:${h.line}`).join(', ')}`,
  );
}

export function runC5(): CheckResult {
  const routes = controllerRoutes();
  const fail: Finding[] = [];
  const notes: string[] = [];
  let pass = unusedKeys(routes, fail, notes);
  pass += unguarded(routes, fail, notes);
  // Route ngoài /admin nhưng làm việc quản trị (kiểm quyền trong service)
  for (const r of routes.filter(
    (x) =>
      /\/requests\/:userId\/:decision|\/requests$/.test(x.path) && !x.path.startsWith('/v1/admin'),
  )) {
    notes.push(
      `${r.file}:${r.line} ${r.method} ${r.path}: quyền (chủ nhóm hoặc groups.action) kiểm trong service (GroupAccessService.canManage)`,
    );
  }
  roleNameChecks(fail, notes);
  return { id: 5, title: 'Permission key → guard', pass, fail, notes };
}

if (isMain('c5-permissions.audit.ts')) printResult(runC5());
