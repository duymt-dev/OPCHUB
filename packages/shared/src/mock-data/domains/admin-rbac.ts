import type { AdminMe } from '../../api';
import {
  ADMIN_RBAC_ERRORS as ERR,
  type AdminAccountCreateParsed,
  type AdminAccountRow,
  type AdminAccountStatus,
  type AdminRoleMatrix,
  type AdminRoleRow,
} from '../../api-domains';
import {
  ADMIN_PERMISSION_KEYS,
  ADMIN_SYSTEM_ROLES,
  type AdminPermissionKey,
  DEFAULT_ADMIN_ROLE_PERMISSIONS,
  effectiveAdminGrants,
} from '../../permissions';
import { mockPasswordOf } from '../auth';
import { logSetting } from './settings-log';
import { mockDb, nextId, type MockDb } from './store';
import { conflict, fieldConflict, iso, MOCK_NOW, notFound, ok, type MockResult } from './util';

/**
 * RBAC Admin §21 cho MSW (TIP-V2-204): 6 TK quản trị prototype ver2 (`stAdmins`) + 5 vai trò hệ
 * thống, cùng luật server (RB-R04 Super Admin bất khả xâm phạm, AT-RB05 xoá vai trò đang dùng 409,
 * SEC-R01 MK tạm). Mật khẩu demo như Admin; phiên MSW = id TK (`Bearer mock.<id>`).
 */

const MIN = 60_000;
const DAY = 24 * 60 * MIN;

interface MockAdmin {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  roleId: string;
  password: string;
  mustChange: boolean;
  twoFactor: boolean;
  status: AdminAccountStatus;
  lastLoginAt: string | null;
  online: boolean;
}

interface MockRole {
  id: string;
  key: string | null;
  name: string;
  description: string;
  keys: AdminPermissionKey[];
}

interface RbacState {
  admins: MockAdmin[];
  roles: MockRole[];
}

const roleId = (key: string) => `role-${key.replace('_', '-')}`;

/** `stAdmins` prototype ver2 (D-52): tên, email, vai trò, 2FA (chưa bật như seed demo, V2Q-114), đăng nhập gần nhất */
const ADMIN_SEED: [string, string, string, string, boolean, number | 'online'][] = [
  ['admin', 'Quản trị hệ thống', 'admin@opchub.community', 'super_admin', false, 'online'],
  ['adm-trang', 'Phạm Thu Trang', 'trang.pham@opchub.community', 'admin', false, 10 * MIN],
  ['adm-yen', 'Đỗ Hải Yến', 'yen.do@opchub.community', 'lecturer', false, DAY + 60 * MIN],
  ['adm-quan', 'Vũ Minh Quân', 'quan.vu@opchub.community', 'lecturer', false, 3 * DAY],
  ['adm-mai', 'Hoàng Thị Mai', 'mai.hoang@opchub.community', 'accountant', false, 2 * 60 * MIN],
  ['adm-hang', 'Ngô Thu Hằng', 'hang.ngo@opchub.community', 'editor', false, DAY + 2 * 60 * MIN],
];

/** Mật khẩu demo của mọi TK quản trị (như seed demo server) */
export const MOCK_ADMIN_PASSWORD = 'Admin@2026';

function seed(): RbacState {
  const roles = ADMIN_SYSTEM_ROLES.map((r): MockRole => ({
    id: roleId(r.key),
    key: r.key,
    name: r.name,
    description: r.description,
    keys: r.key === 'super_admin' ? [] : [...DEFAULT_ADMIN_ROLE_PERMISSIONS[r.key]],
  }));
  const admins = ADMIN_SEED.map(([id, name, email, key, twoFactor, last]): MockAdmin => ({
    id,
    name,
    email,
    phone: null,
    roleId: roleId(key),
    password: MOCK_ADMIN_PASSWORD,
    mustChange: false,
    twoFactor,
    status: 'active',
    online: last === 'online',
    lastLoginAt: iso(last === 'online' ? MOCK_NOW : MOCK_NOW - last),
  }));
  return { admins, roles };
}

const states = new WeakMap<MockDb, RbacState>();
function state(): RbacState {
  const db = mockDb();
  let s = states.get(db);
  if (!s) {
    s = seed();
    states.set(db, s);
  }
  return s;
}

const roleOf = (id: string | null) => state().roles.find((r) => r.id === id);
const grantsOf = (r: MockRole | undefined) => (r ? effectiveAdminGrants(r.key, r.keys) : []);

function toRow(a: MockAdmin): AdminAccountRow {
  const r = roleOf(a.roleId);
  return {
    id: a.id,
    name: a.name,
    email: a.email,
    phone: a.phone,
    roleId: a.roleId,
    roleName: r?.name ?? null,
    isSuperAdmin: r?.key === 'super_admin',
    twoFactor: a.twoFactor,
    status: a.status,
    online: a.online,
    lastLoginAt: a.lastLoginAt,
    createdAt: iso(MOCK_NOW - 30 * DAY),
  };
}

/** `requireAdmin2fa` của Cài đặt bảo mật — truyền vào để không phụ thuộc vòng module */
export function mockAdminMeOf(id: string, require2fa = false): AdminMe | null {
  const a = state().admins.find((x) => x.id === id);
  if (!a) return null;
  const r = roleOf(a.roleId);
  return {
    id: a.id,
    name: a.name,
    email: a.email,
    roleId: a.roleId,
    roleName: r?.name ?? null,
    isSuperAdmin: r?.key === 'super_admin',
    permissions: [...grantsOf(r)],
    mustChangePassword: a.mustChange,
    twoFactor: a.twoFactor,
    twoFactorRequired: require2fa && !a.twoFactor,
  };
}

export type MockAdminLogin = { ok: true; id: string } | { ok: false; reason: 'invalid' | 'locked' };

/** Đăng nhập Admin MSW: khoá chỉ báo khi mật khẩu đúng (như server, AT-RB04) */
export function mockAdminLogin(email: string, password: string): MockAdminLogin {
  const a = state().admins.find((x) => x.email === email.trim().toLowerCase());
  if (!a || mockPasswordOf(a.email, a.password) !== password)
    return { ok: false, reason: 'invalid' };
  if (a.status === 'locked') return { ok: false, reason: 'locked' };
  return { ok: true, id: a.id };
}

export function mockAdminFirstPassword(id: string, password: string): void {
  const a = state().admins.find((x) => x.id === id);
  if (a) Object.assign(a, { password, mustChange: false });
}

export function mockAdminEnable2fa(id: string): void {
  const a = state().admins.find((x) => x.id === id);
  if (a) a.twoFactor = true;
}

export const mockAdminPassword = (id: string) => state().admins.find((x) => x.id === id)?.password;

/** TK quản trị active có khoá `key` (D-63: nhân sự phụ trách = `services.action`) */
export function mockAdminsWith(key: AdminPermissionKey): { id: string; name: string }[] {
  return state()
    .admins.filter((a) => a.status === 'active' && grantsOf(roleOf(a.roleId)).includes(key))
    .map((a) => ({ id: a.id, name: a.name }));
}

export const listMockAdminAccounts = (): AdminAccountRow[] => state().admins.map(toRow);

export function listMockAdminRoles(): AdminRoleRow[] {
  const s = state();
  return s.roles.map((r) => ({
    id: r.id,
    key: r.key,
    name: r.name,
    description: r.description,
    isSystem: r.key !== null,
    accountCount: s.admins.filter((a) => a.roleId === r.id).length,
    permissions: grantsOf(r),
  }));
}

const target = (id: string): MockResult<MockAdmin> => {
  const a = state().admins.find((x) => x.id === id);
  if (!a) return notFound(ERR.accountNotFound);
  if (roleOf(a.roleId)?.key === 'super_admin') return conflict(ERR.superAdminProtected);
  return ok(a);
};

export function createMockAdmin(
  actorId: string,
  b: AdminAccountCreateParsed,
  memberEmails: readonly string[],
): MockResult<AdminAccountRow> {
  const s = state();
  if (s.admins.some((a) => a.email === b.email)) return fieldConflict('email', ERR.emailAdminTaken);
  if (memberEmails.includes(b.email)) return fieldConflict('email', ERR.emailMemberTaken);
  const r = roleOf(b.roleId);
  if (!r) return notFound(ERR.roleNotFound);
  if (r.key === 'super_admin') return fieldConflict('roleId', ERR.roleSuperAdmin);
  const a: MockAdmin = {
    id: nextId('adm'),
    name: b.name,
    email: b.email,
    phone: b.phone,
    roleId: r.id,
    password: b.password,
    mustChange: true,
    twoFactor: false,
    status: 'active',
    online: false,
    lastLoginAt: null,
  };
  s.admins.push(a);
  logSetting(
    actorId,
    'admin_account.create',
    a.id,
    `tạo tài khoản quản trị ${a.name} (${r.name})`,
    'permission',
  );
  return ok(toRow(a));
}

export function setMockAdminStatus(
  actorId: string,
  id: string,
  status: AdminAccountStatus,
): MockResult<AdminAccountRow> {
  const t = target(id);
  if (!t.ok) return t;
  if (t.data.status === status) return conflict(ERR.statusUnchanged);
  t.data.status = status;
  const verb = status === 'locked' ? 'khóa' : 'mở khóa';
  logSetting(
    actorId,
    `admin_account.${status === 'locked' ? 'lock' : 'unlock'}`,
    id,
    `${verb} tài khoản quản trị ${t.data.name}`,
    'permission',
  );
  return ok(toRow(t.data));
}

export function setMockAdminRole(
  actorId: string,
  id: string,
  newRoleId: string,
): MockResult<AdminAccountRow> {
  const t = target(id);
  if (!t.ok) return t;
  const r = roleOf(newRoleId);
  if (!r) return notFound(ERR.roleNotFound);
  if (r.key === 'super_admin') return conflict(ERR.roleSuperAdmin);
  t.data.roleId = r.id;
  logSetting(
    actorId,
    'admin_account.role',
    id,
    `đổi vai trò ${t.data.name} thành ${r.name}`,
    'permission',
  );
  return ok(toRow(t.data));
}

export function revokeMockAdmin(actorId: string, id: string): MockResult<{ id: string }> {
  const t = target(id);
  if (!t.ok) return t;
  state().admins = state().admins.filter((a) => a.id !== id);
  logSetting(
    actorId,
    'admin_account.revoke',
    id,
    `thu hồi quyền quản trị của ${t.data.name}`,
    'permission',
  );
  return ok({ id });
}

export function createMockRole(
  actorId: string,
  name: string,
  description: string,
): MockResult<AdminRoleRow> {
  const s = state();
  if (s.roles.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
    return fieldConflict('name', ERR.roleNameTaken);
  }
  const r: MockRole = { id: nextId('role'), key: null, name, description, keys: [] };
  s.roles.push(r);
  logSetting(actorId, 'roles.create', r.id, `tạo vai trò ${name}`, 'permission');
  const row = listMockAdminRoles().find((x) => x.id === r.id);
  return row ? ok(row) : notFound(ERR.roleNotFound);
}

export function deleteMockRole(actorId: string, id: string): MockResult<{ id: string }> {
  const s = state();
  const r = roleOf(id);
  if (!r) return notFound(ERR.roleNotFound);
  if (r.key !== null) return conflict(ERR.roleSystemDelete);
  const n = s.admins.filter((a) => a.roleId === id).length;
  if (n) return conflict(ERR.roleInUse(n));
  s.roles = s.roles.filter((x) => x.id !== id);
  logSetting(actorId, 'roles.delete', id, `xoá vai trò ${r.name}`, 'permission');
  return ok({ id });
}

export function saveMockMatrix(actorId: string, m: AdminRoleMatrix): MockResult<AdminRoleRow[]> {
  const ids = Object.keys(m);
  const found = ids.map(roleOf);
  if (found.some((r) => r?.key === 'super_admin')) return conflict(ERR.superAdminMatrix);
  if (found.some((r) => !r)) return notFound(ERR.roleNotFound);
  for (const r of found) {
    if (r) r.keys = ADMIN_PERMISSION_KEYS.filter((k) => (m[r.id] ?? []).includes(k));
  }
  const names = found.flatMap((r) => (r ? [r.name] : [])).join(', ');
  logSetting(
    actorId,
    'roles.permissions',
    'admin_roles',
    `cập nhật phân quyền ${names}`,
    'permission',
  );
  return ok(listMockAdminRoles());
}
