import { ADMIN_PERMISSION_KEYS, type AdminPermissionKey } from '@opchub/shared';
import type { AdminCategory, AdminRoleRow } from '@opchub/shared/api-domains';
import type { CategoryDraft, CategoryFilter } from './types';

/** Logic thuần của màn Cài đặt — test ở model.spec.ts */

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const isEmail = (v: string) => EMAIL_RE.test(v.trim());

/** Ma trận nháp `{ [roleId]: khoá[] }` của vai trò sửa được (không gồm Super Admin — RB-R05) */
export type RoleMatrix = Record<string, readonly AdminPermissionKey[]>;

export function matrixOf(roles: readonly AdminRoleRow[]): RoleMatrix {
  return Object.fromEntries(roles.filter((r) => !isSuperRole(r)).map((r) => [r.id, r.permissions]));
}

/** Super Admin = vai trò hệ thống có khoá `super_admin` (khoá cố định của `admin_roles`, RB-R05) */
export const isSuperRole = (r: Pick<AdminRoleRow, 'key'>) => r.key === 'super_admin';

/** Bật/tắt một khoá của vai trò, giữ thứ tự chuẩn 25 khoá */
export function togglePermission(
  m: RoleMatrix,
  roleId: string,
  key: AdminPermissionKey,
): RoleMatrix {
  const cur = m[roleId] ?? [];
  const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
  return { ...m, [roleId]: ADMIN_PERMISSION_KEYS.filter((k) => next.includes(k)) };
}

/** Số ô khác nhau giữa hai ma trận (để hỏi xác nhận "N thay đổi") */
export function countPermissionChanges(a: RoleMatrix, b: RoleMatrix): number {
  let n = 0;
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)]))
    for (const k of ADMIN_PERMISSION_KEYS)
      if ((a[id] ?? []).includes(k) !== (b[id] ?? []).includes(k)) n += 1;
  return n;
}

/** Mật khẩu tạm ngẫu nhiên đủ luật SEC-R01 (prototype `gen`: OPC@ + 4 chữ hoa/số + 2 số) */
export function tempPassword(rand: () => number = Math.random): string {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = () => A[Math.floor(rand() * A.length)] ?? 'A';
  return `OPC@${pick()}${pick()}${pick()}${pick()}${10 + Math.floor(rand() * 89)}`;
}

export function filterCategories(rows: AdminCategory[], f: CategoryFilter) {
  return rows.map((c, i) => ({ c, i })).filter(({ c }) => f === 'all' || c.scope.includes(f));
}

export type CategoryError = 'needName' | 'exists' | 'needScope';
export type CategoryField = 'name' | 'scope';
export type CategoryErrors = Partial<Record<CategoryField, CategoryError>>;

/** Kiểm MỌI ô (BUG-022): tên (trống / trùng) rồi nơi áp dụng. Rỗng = hợp lệ */
export function validateCategory(d: CategoryDraft, rows: AdminCategory[]): CategoryErrors {
  const e: CategoryErrors = {};
  const n = d.name.trim();
  if (!n) e.name = 'needName';
  else if (rows.some((c) => c.id !== d.id && c.name.toLowerCase() === n.toLowerCase()))
    e.name = 'exists';
  if (!d.scope.length) e.scope = 'needScope';
  return e;
}

/** path lỗi server (POST/PUT /admin/settings/categories) → ô form */
export const CATEGORY_FIELD_MAP = { name: 'name', scope: 'scope' } as const;

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

/** Màu thẻ vai trò theo thứ tự danh sách (prototype `ADM_TONE`) */
const ROLE_TONES = [
  ['#F9F0FF', '#722ED1'],
  ['#E6F4FF', '#1677FF'],
  ['#F6FFED', '#389E0D'],
  ['#FFF7E6', '#D46B08'],
  ['#E6FFFB', '#08979C'],
  ['#FFF0F6', '#C41D7F'],
  ['#F0F5FF', '#2F54EB'],
] as const;

export function roleTone(index: number): { bg: string; fg: string } {
  const [bg, fg] = ROLE_TONES[Math.max(0, index) % ROLE_TONES.length] ?? ROLE_TONES[0];
  return { bg, fg };
}
