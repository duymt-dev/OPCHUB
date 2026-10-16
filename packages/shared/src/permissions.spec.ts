import { describe, expect, it } from 'vitest';
import { ALL_PERMISSIONS, hasPermission } from './permissions';

describe('hasPermission', () => {
  it('super_admin có mọi quyền', () => {
    expect(ALL_PERMISSIONS.every((k) => hasPermission('super_admin', k))).toBe(true);
  });

  it('admin mặc định không có s.role', () => {
    expect(hasPermission('admin', 's.role')).toBe(false);
    expect(hasPermission('admin', 'm.edit')).toBe(true);
  });

  it('moderator chỉ có quyền điều phối theo prototype', () => {
    expect(hasPermission('moderator', 'c.mod')).toBe(true);
    expect(hasPermission('moderator', 'm.edit')).toBe(false);
  });

  it('member không có quyền quản trị', () => {
    expect(ALL_PERMISSIONS.some((k) => hasPermission('member', k))).toBe(false);
  });
});
