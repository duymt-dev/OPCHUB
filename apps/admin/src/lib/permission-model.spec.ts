import {
  ADMIN_MENU_KEYS,
  type AdminMenuKey,
  type AdminSystemRoleKey,
  DEFAULT_ADMIN_ROLE_PERMISSIONS,
  effectiveAdminGrants,
} from '@opchub/shared';
import { describe, expect, it } from 'vitest';
import { actionKeysOf, menuAccess } from './permission-model';

const grantsOf = (key: AdminSystemRoleKey) => ({
  keys: effectiveAdminGrants(key, key === 'super_admin' ? [] : DEFAULT_ADMIN_ROLE_PERMISSIONS[key]),
  roleName: key,
  previewing: false,
});
const visible = (key: AdminSystemRoleKey) =>
  ADMIN_MENU_KEYS.filter((m) => menuAccess(grantsOf(key), m).visible);
const readOnly = (key: AdminSystemRoleKey) =>
  ADMIN_MENU_KEYS.filter((m) => menuAccess(grantsOf(key), m).readOnly);

describe('REQ-326 menu visible/readOnly theo ma trận §21.2 (RB-R06, RB-R07)', () => {
  it('Super Admin: mọi menu, không chỉ xem', () => {
    expect(visible('super_admin')).toEqual([...ADMIN_MENU_KEYS]);
    expect(readOnly('super_admin')).toEqual([]);
  });

  it('Quản trị viên: mọi menu; Affiliate vẫn thao tác được (thiếu chi trả, có sửa)', () => {
    expect(visible('admin')).toEqual([...ADMIN_MENU_KEYS]);
    expect(readOnly('admin')).toEqual([]);
  });

  it('AT-RB02 Kế toán: Tổng quan, Thành viên, Phí, Dịch vụ, Affiliate, Cài đặt', () => {
    expect(visible('accountant')).toEqual<AdminMenuKey[]>([
      'overview',
      'members',
      'fees',
      'services',
      'affiliate',
      'settings',
    ]);
    expect(readOnly('accountant')).toEqual<AdminMenuKey[]>(['members', 'services']);
  });

  it('AT-RB03 Giảng viên: Thành viên chỉ xem', () => {
    expect(readOnly('lecturer')).toContain('members');
    expect(visible('lecturer')).not.toContain('fees');
  });

  it('Biên tập nội dung: không thấy Thành viên', () => {
    expect(visible('editor')).not.toContain('members');
    expect(visible('editor')).toContain('bots');
  });

  it('RB-R09 xem thử: menu theo vai trò xem thử, mọi menu chỉ xem', () => {
    const g = { ...grantsOf('editor'), previewing: true };
    const vis = ADMIN_MENU_KEYS.filter((m) => menuAccess(g, m).visible);
    expect(
      vis.filter((m) => actionKeysOf(m).length > 0).every((m) => menuAccess(g, m).readOnly),
    ).toBe(true);
  });

  it('RB-R07 menu chỉ có quyền Xem (Tổng quan) không hiện chỉ xem, kể cả khi xem thử', () => {
    const g = { ...grantsOf('accountant'), previewing: true };
    expect(menuAccess(g, 'overview')).toEqual({ visible: true, readOnly: false });
  });
});
