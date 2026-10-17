import { ALL_PERMISSIONS, type PermissionKey } from '@opchub/shared';
import type { AdminCategory, RolePermissions } from '@opchub/shared/api-domains';
import type { CategoryDraft, CategoryFilter } from './types';

/** Logic thuần của màn Cài đặt — test ở model.spec.ts */

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const isEmail = (v: string) => EMAIL_RE.test(v.trim());

export type EditableRole = keyof RolePermissions;
export const EDITABLE_ROLES: readonly EditableRole[] = ['admin', 'moderator', 'member'];

/** Bật/tắt một quyền của vai trò (Super Admin không nằm trong ma trận sửa được) */
export function togglePermission(
  p: RolePermissions,
  role: EditableRole,
  key: PermissionKey,
): RolePermissions {
  const cur = p[role];
  const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
  // Giữ thứ tự chuẩn của PERMISSION_GROUPS để so sánh / gửi ổn định
  return { ...p, [role]: ALL_PERMISSIONS.filter((k) => next.includes(k)) };
}

/** Số ô khác nhau giữa hai ma trận (để hỏi xác nhận "N thay đổi") */
export function countPermissionChanges(a: RolePermissions, b: RolePermissions): number {
  let n = 0;
  for (const r of EDITABLE_ROLES)
    for (const k of ALL_PERMISSIONS) if (a[r].includes(k) !== b[r].includes(k)) n += 1;
  return n;
}

export function filterCategories(rows: AdminCategory[], f: CategoryFilter) {
  return rows.map((c, i) => ({ c, i })).filter(({ c }) => f === 'all' || c.scope.includes(f));
}

export type CategoryError = 'needName' | 'exists' | 'needScope';
export function validateCategory(d: CategoryDraft, rows: AdminCategory[]): CategoryError | null {
  const n = d.name.trim();
  if (!n) return 'needName';
  if (rows.some((c) => c.id !== d.id && c.name.toLowerCase() === n.toLowerCase())) return 'exists';
  if (!d.scope.length) return 'needScope';
  return null;
}

/** Đổi chỗ hai phần tử; trả null nếu ra ngoài biên */
export function moveId(ids: string[], i: number, d: -1 | 1): string[] | null {
  const j = i + d;
  if (j < 0 || j >= ids.length) return null;
  const out = [...ids];
  const a = out[i];
  const b = out[j];
  if (a === undefined || b === undefined) return null;
  out[i] = b;
  out[j] = a;
  return out;
}

export type RelTime =
  { k: 'now' } | { k: 'minutes' | 'hours' | 'days'; n: number } | { k: 'yesterday' };

/** "10 phút trước" / "5 giờ trước" / "Hôm qua" / "3 ngày trước" như prototype */
export function relativeTime(at: string, now: number): RelTime {
  const diff = Math.max(0, now - Date.parse(at));
  const min = Math.floor(diff / 60_000);
  if (min < 1) return { k: 'now' };
  if (min < 60) return { k: 'minutes', n: min };
  const h = Math.floor(min / 60);
  if (h < 24) return { k: 'hours', n: h };
  const d = Math.floor(h / 24);
  return d === 1 ? { k: 'yesterday' } : { k: 'days', n: d };
}

/** Số nguyên dương từ ô nhập (cổng, giới hạn gửi) */
export function positiveInt(v: string): number | null {
  const n = Number(v.trim());
  return Number.isInteger(n) && n > 0 ? n : null;
}

export const isHttpUrl = (v: string) => /^https?:\/\/\S+$/.test(v.trim());

/** Khoá message của permission key (next-intl coi "." là phân cấp nên đổi sang "_") */
export const PERM_MSG = {
  'm.view': 'perm.m_view',
  'm.edit': 'perm.m_edit',
  'm.role': 'perm.m_role',
  'c.create': 'perm.c_create',
  'c.room': 'perm.c_room',
  'c.mod': 'perm.c_mod',
  'p.edit': 'perm.p_edit',
  'p.pub': 'perm.p_pub',
  'e.edit': 'perm.e_edit',
  'e.reg': 'perm.e_reg',
  'n.edit': 'perm.n_edit',
  's.cfg': 'perm.s_cfg',
  's.role': 'perm.s_role',
  's.log': 'perm.s_log',
} as const satisfies Record<PermissionKey, `perm.${string}`>;
