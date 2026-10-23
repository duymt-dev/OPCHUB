import {
  type AdminSystemRoleKey,
  DEFAULT_ADMIN_ROLE_PERMISSIONS,
  effectiveAdminGrants,
} from '@opchub/shared';
import { describe, expect, it } from 'vitest';
import { navModel } from './nav-model';

const g = (key: AdminSystemRoleKey) => ({
  keys: effectiveAdminGrants(key, key === 'super_admin' ? [] : DEFAULT_ADMIN_ROLE_PERMISSIONS[key]),
  roleName: key,
  previewing: false,
});
const keys = (key: AdminSystemRoleKey) => navModel(g(key), '/overview').items.map((n) => n.key);

describe('sidebar Admin §27.3 (TIP-V4-606)', () => {
  it('REQ-514 D-80 Super Admin: thứ tự prototype v4, không Marketing, Cài đặt ngoài sidebar', () => {
    expect(keys('super_admin')).toEqual([
      'overview',
      'members',
      'fees',
      'groups',
      'bots',
      'events',
      'projects',
      'investors',
      'requests',
      'affiliate',
    ]);
    expect(navModel(g('super_admin'), '/overview').canSettings).toBe(true);
  });

  it('REQ-514 nhóm: mục đầu mỗi nhóm theo `GR` v4', () => {
    const items = navModel(g('super_admin'), '/overview').items;
    const heads = items.filter((n, i) => n.group && items[i - 1]?.group !== n.group);
    expect(heads.map((n) => [n.key, n.group])).toEqual([
      ['members', 'people'],
      ['projects', 'business'],
      ['requests', 'revenue'],
    ]);
  });

  it('REQ-515 D-73 /marketing → 403 nội bộ kể cả Super Admin', () => {
    expect(navModel(g('super_admin'), '/marketing').allowed).toBe(false);
    expect(navModel(g('super_admin'), '/marketing/campaigns').allowed).toBe(false);
  });

  it('RB-R06 /settings vẫn mở được khi có khoá Cài đặt; Giảng viên không có → 403 + ẩn mục', () => {
    expect(navModel(g('accountant'), '/settings').allowed).toBe(true);
    expect(navModel(g('accountant'), '/settings').canSettings).toBe(true);
    expect(navModel(g('lecturer'), '/settings').allowed).toBe(false);
    expect(navModel(g('lecturer'), '/overview').canSettings).toBe(false);
  });

  it('Kế toán chỉ thấy mục có quyền, theo đúng thứ tự', () => {
    expect(keys('accountant')).toEqual(['overview', 'members', 'fees', 'requests', 'affiliate']);
  });
});
