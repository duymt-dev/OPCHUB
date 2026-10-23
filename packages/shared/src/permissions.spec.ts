import { describe, expect, it } from 'vitest';
import {
  ADMIN_MENU_KEYS,
  ADMIN_MENUS,
  ADMIN_PERMISSION_KEYS,
  ADMIN_PERMISSIONS,
  ADMIN_SYSTEM_ROLE_KEYS,
  ADMIN_SYSTEM_ROLES,
  type AdminPermissionKey,
  DEFAULT_ADMIN_ROLE_PERMISSIONS,
  effectiveAdminGrants,
  can,
  viewKeyOf,
} from './permissions';

describe('RBAC Admin 27 khoá (TIP-V2-201, V4-606)', () => {
  it('REQ-325 REQ-514 27 khoá, đúng 12 menu, mỗi menu có .view', () => {
    expect(ADMIN_PERMISSIONS).toHaveLength(27);
    expect(new Set(ADMIN_PERMISSION_KEYS).size).toBe(27);
    expect(ADMIN_MENUS.map((m) => m.key)).toEqual([...ADMIN_MENU_KEYS]);
    expect(ADMIN_MENUS).toHaveLength(12);
    for (const m of ADMIN_MENUS) {
      expect(m.keys.every((k) => k.startsWith(`${m.key}.`))).toBe(true);
      // Cài đặt: mỗi tab một khoá, không có khoá Xem chung (RB-R06, V2Q-112)
      if (m.key === 'settings') expect(m.view).toBeNull();
      else expect(m.view).toBe(`${m.key}.view`);
    }
    expect(ADMIN_MENUS.flatMap((m) => m.keys)).toEqual([...ADMIN_PERMISSION_KEYS]);
    expect(ADMIN_PERMISSION_KEYS.slice(-6)).toEqual([
      'settings.general',
      'settings.mail',
      'settings.admins',
      'settings.log',
      'stores.view',
      'stores.action',
    ]);
  });

  it('REQ-324 ma trận mặc định khớp §21.2 + prototype v4 `ADM_DEF`', () => {
    // Cột: Quản trị viên | Giảng viên | Kế toán | Biên tập nội dung (1 = ✓) — §21.2; 2 dòng cuối v4
    const TABLE: [AdminPermissionKey, string][] = [
      ['overview.view', '1111'],
      ['members.view', '1110'],
      ['members.action', '1000'],
      ['fees.view', '1010'],
      ['fees.action', '1010'],
      ['groups.view', '1101'],
      ['groups.action', '1100'],
      ['groups.moderate', '1100'],
      ['bots.view', '1001'],
      ['bots.action', '1001'],
      ['events.view', '1101'],
      ['events.action', '1101'],
      ['projects.view', '1001'],
      ['projects.action', '1001'],
      ['investors.view', '1000'],
      ['investors.action', '1000'],
      ['services.view', '1010'],
      ['services.action', '1000'],
      ['affiliate.view', '1010'],
      ['affiliate.action', '1010'],
      ['affiliate.payout', '0010'],
      ['settings.general', '1000'],
      ['settings.mail', '1000'],
      ['settings.admins', '0000'],
      ['settings.log', '1010'],
      ['stores.view', '1001'],
      ['stores.action', '1001'],
    ];
    expect(TABLE.map(([k]) => k)).toEqual([...ADMIN_PERMISSION_KEYS]);
    const roles = ['admin', 'lecturer', 'accountant', 'editor'] as const;
    roles.forEach((role, col) => {
      const want = TABLE.filter(([, v]) => v[col] === '1').map(([k]) => k);
      expect([...DEFAULT_ADMIN_ROLE_PERMISSIONS[role]].sort()).toEqual(want.sort());
    });
    expect(DEFAULT_ADMIN_ROLE_PERMISSIONS.admin).toHaveLength(25);
    expect(ADMIN_SYSTEM_ROLES.map((r) => r.key)).toEqual([...ADMIN_SYSTEM_ROLE_KEYS]);
    expect(effectiveAdminGrants('super_admin', [])).toEqual([...ADMIN_PERMISSION_KEYS]);
    expect(effectiveAdminGrants('lecturer', ['events.view', 'overview.view'])).toEqual([
      'overview.view',
      'events.view',
    ]);
  });
});

describe('viewKeyOf / can (TIP-V2-203, RB-R07)', () => {
  it('REQ-327 khoá thao tác → khoá Xem của menu; khoá Xem / Cài đặt → null', () => {
    expect(viewKeyOf('members.action')).toBe('members.view');
    expect(viewKeyOf('groups.moderate')).toBe('groups.view');
    expect(viewKeyOf('affiliate.payout')).toBe('affiliate.view');
    expect(viewKeyOf('members.view')).toBeNull();
    expect(viewKeyOf('settings.admins')).toBeNull();
  });

  it('REQ-325 can chỉ theo danh sách khoá của phiên', () => {
    expect(can(['events.view'], 'events.view')).toBe(true);
    expect(can(['events.view'], 'events.action')).toBe(false);
    expect(can([], 'overview.view')).toBe(false);
  });
});
