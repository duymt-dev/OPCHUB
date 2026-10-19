import { isStrongAdminPassword } from '@opchub/shared/api';
import type { AdminCategory } from '@opchub/shared/api-domains';
import {
  countPermissionChanges,
  filterCategories,
  isEmail,
  moveId,
  positiveInt,
  relativeTime,
  tempPassword,
  togglePermission,
  validateCategory,
} from './model';

const perms = { r1: ['members.view' as const], r2: [] };

const cat = (id: string, name: string, scope: AdminCategory['scope']): AdminCategory => ({
  id,
  name,
  color: '#1677FF',
  scope,
  enabled: true,
  projectCount: 0,
  bizCount: 0,
});

describe('settings model', () => {
  it('REQ-228 ma trận: bật/tắt giữ thứ tự 25 khoá và đếm thay đổi', () => {
    const a = togglePermission(perms, 'r2', 'events.view');
    expect(a.r2).toEqual(['events.view']);
    const b = togglePermission(a, 'r2', 'members.view');
    expect(b.r2).toEqual(['members.view', 'events.view']);
    expect(countPermissionChanges(perms, b)).toBe(2);
    expect(countPermissionChanges(perms, togglePermission(b, 'r2', 'events.view'))).toBe(1);
  });

  it('SEC-R01 mật khẩu tạm ngẫu nhiên đủ luật', () => {
    for (let i = 0; i < 20; i += 1) expect(isStrongAdminPassword(tempPassword())).toBe(true);
  });

  it('lọc lĩnh vực theo nơi áp dụng, giữ số thứ tự gốc', () => {
    const rows = [
      cat('a', 'A', ['project']),
      cat('b', 'B', ['biz']),
      cat('c', 'C', ['project', 'biz']),
    ];
    expect(filterCategories(rows, 'biz').map((r) => r.i)).toEqual([1, 2]);
    expect(filterCategories(rows, 'all')).toHaveLength(3);
  });

  it('kiểm tra form lĩnh vực', () => {
    const rows = [cat('a', 'Fintech', ['project'])];
    const d = { id: null, name: ' ', color: '#1677FF', scope: ['project' as const] };
    expect(validateCategory(d, rows)).toEqual({ name: 'needName' });
    expect(validateCategory({ ...d, name: 'fintech' }, rows)).toEqual({ name: 'exists' });
    expect(validateCategory({ ...d, id: 'a', name: 'fintech' }, rows)).toEqual({});
    expect(validateCategory({ ...d, name: 'Mới', scope: [] }, rows)).toEqual({
      scope: 'needScope',
    });
  });
  it('BUG-022 validateCategory trả mọi lỗi (tên + nơi áp dụng cùng lúc)', () => {
    const rows = [cat('a', 'Fintech', ['project'])];
    const d = { id: null, name: ' ', color: '#1677FF', scope: [] };
    const all = validateCategory(d, rows);
    expect(all).toEqual({ name: 'needName', scope: 'needScope' });
    expect(Object.keys(all)).toEqual(['name', 'scope']);
  });

  it('đổi chỗ thứ tự trong biên', () => {
    expect(moveId(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveId(['a', 'b'], 0, -1)).toBeNull();
    expect(moveId(['a', 'b'], 1, 1)).toBeNull();
  });

  it('thời gian tương đối như prototype', () => {
    const now = Date.parse('2026-10-16T02:00:00Z');
    const ago = (ms: number) => new Date(now - ms).toISOString();
    expect(relativeTime(ago(10_000), now)).toEqual({ k: 'now' });
    expect(relativeTime(ago(10 * 60_000), now)).toEqual({ k: 'minutes', n: 10 });
    expect(relativeTime(ago(5 * 3600_000), now)).toEqual({ k: 'hours', n: 5 });
    expect(relativeTime(ago(25 * 3600_000), now)).toEqual({ k: 'yesterday' });
    expect(relativeTime(ago(73 * 3600_000), now)).toEqual({ k: 'days', n: 3 });
  });

  it('email và số nguyên dương', () => {
    expect(isEmail('x@y.vn')).toBe(true);
    expect(isEmail('x@y')).toBe(false);
    expect(positiveInt('587')).toBe(587);
    expect(positiveInt('0')).toBeNull();
    expect(positiveInt('abc')).toBeNull();
  });
});
