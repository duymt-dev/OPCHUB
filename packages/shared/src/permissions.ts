/** Permission key (D-20) — dùng chung FE/BE */
export const PERMISSION_GROUPS = [
  { label: 'Thành viên', keys: ['m.view', 'm.edit', 'm.role'] },
  { label: 'Cộng đồng & Chat', keys: ['c.create', 'c.room', 'c.mod'] },
  { label: 'Dự án', keys: ['p.edit', 'p.pub'] },
  { label: 'Sự kiện & Nội dung', keys: ['e.edit', 'e.reg', 'n.edit'] },
  { label: 'Hệ thống', keys: ['s.cfg', 's.role', 's.log'] },
] as const;

export type PermissionKey = (typeof PERMISSION_GROUPS)[number]['keys'][number];

export const ALL_PERMISSIONS: readonly PermissionKey[] = PERMISSION_GROUPS.flatMap((g) => g.keys);

export type SystemRole = 'super_admin' | 'admin' | 'moderator' | 'member';

/** Quyền mặc định theo prototype (DEF) */
export const DEFAULT_ROLE_PERMISSIONS: Record<
  Exclude<SystemRole, 'super_admin'>,
  PermissionKey[]
> = {
  admin: ALL_PERMISSIONS.filter((k) => k !== 's.role'),
  moderator: ['m.view', 'c.room', 'c.mod', 'e.reg'],
  member: [],
};

export function hasPermission(
  role: SystemRole,
  key: PermissionKey,
  grants: Partial<Record<SystemRole, readonly PermissionKey[]>> = DEFAULT_ROLE_PERMISSIONS,
): boolean {
  return role === 'super_admin' || (grants[role]?.includes(key) ?? false);
}

/* ── RBAC Admin (SRS-3.6 §21, D-52) — 25 khoá theo 11 menu (TIP-V2-201). Khoá cũ ở trên giữ tới TIP-V2-204 ── */

/** 11 menu Admin theo thứ tự sidebar prototype ver2 (`ADM_PERMS`) */
export const ADMIN_MENU_KEYS = [
  'overview',
  'members',
  'fees',
  'groups',
  'bots',
  'events',
  'projects',
  'investors',
  'services',
  'affiliate',
  'settings',
] as const;
export type AdminMenuKey = (typeof ADMIN_MENU_KEYS)[number];

/** 25 khoá, đúng thứ tự `ADM_PERMS`; nhãn = cột "Quyền" §21.2 */
export const ADMIN_PERMISSIONS = [
  { key: 'overview.view', menu: 'overview', label: 'Xem tổng quan & số liệu' },
  { key: 'members.view', menu: 'members', label: 'Xem danh sách & chi tiết' },
  { key: 'members.action', menu: 'members', label: 'Khóa / mở, gán nhóm, xuất dữ liệu' },
  { key: 'fees.view', menu: 'fees', label: 'Xem tình trạng phí' },
  { key: 'fees.action', menu: 'fees', label: 'Ghi nhận đã thu, nhắc phí' },
  { key: 'groups.view', menu: 'groups', label: 'Xem nhóm & phòng chat' },
  { key: 'groups.action', menu: 'groups', label: 'Tạo / sửa nhóm, chủ đề, duyệt thành viên' },
  { key: 'groups.moderate', menu: 'groups', label: 'Kiểm duyệt tin nhắn nhạy cảm' },
  { key: 'bots.view', menu: 'bots', label: 'Xem bot' },
  { key: 'bots.action', menu: 'bots', label: 'Cấu hình persona & kịch bản' },
  { key: 'events.view', menu: 'events', label: 'Xem sự kiện & danh sách đăng ký' },
  { key: 'events.action', menu: 'events', label: 'Tạo / sửa sự kiện, check-in' },
  { key: 'projects.view', menu: 'projects', label: 'Xem dự án' },
  { key: 'projects.action', menu: 'projects', label: 'Duyệt / ẩn dự án' },
  { key: 'investors.view', menu: 'investors', label: 'Xem nhà đầu tư' },
  { key: 'investors.action', menu: 'investors', label: 'Trao đổi & xuất dữ liệu' },
  { key: 'services.view', menu: 'services', label: 'Xem yêu cầu dịch vụ' },
  { key: 'services.action', menu: 'services', label: 'Xử lý yêu cầu & danh mục dịch vụ' },
  { key: 'affiliate.view', menu: 'affiliate', label: 'Xem đại lý & hoa hồng' },
  { key: 'affiliate.action', menu: 'affiliate', label: 'Sửa % hoa hồng, hủy hoa hồng' },
  { key: 'affiliate.payout', menu: 'affiliate', label: 'Chi trả hoa hồng' },
  { key: 'settings.general', menu: 'settings', label: 'Thông tin chung & danh mục lĩnh vực' },
  { key: 'settings.mail', menu: 'settings', label: 'Email chào mừng & SMTP' },
  { key: 'settings.admins', menu: 'settings', label: 'Tài khoản quản trị & phân quyền' },
  { key: 'settings.log', menu: 'settings', label: 'Nhật ký hoạt động' },
] as const satisfies readonly {
  key: `${AdminMenuKey}.${string}`;
  menu: AdminMenuKey;
  label: string;
}[];

export type AdminPermissionKey = (typeof ADMIN_PERMISSIONS)[number]['key'];
export const ADMIN_PERMISSION_KEYS: readonly AdminPermissionKey[] = ADMIN_PERMISSIONS.map(
  (p) => p.key,
);

export interface AdminMenu {
  key: AdminMenuKey;
  label: string;
  /**
   * Quyền Xem của menu (`<menu>.view`). Cài đặt không có khoá Xem chung: mỗi tab một khoá
   * (RB-R06) → `null`, menu hiện khi có ít nhất một khoá (V2Q-112).
   */
  view: AdminPermissionKey | null;
  keys: readonly AdminPermissionKey[];
}

const MENU_LABEL: Record<AdminMenuKey, string> = {
  overview: 'Tổng quan',
  members: 'Thành viên',
  fees: 'Phí thành viên',
  groups: 'Nhóm cộng đồng',
  bots: 'Bot tương tác',
  events: 'Nội dung & Sự kiện',
  projects: 'Dự án',
  investors: 'Nhà đầu tư',
  services: 'Dịch vụ',
  affiliate: 'Affiliate',
  settings: 'Cài đặt',
};

export const ADMIN_MENUS: readonly AdminMenu[] = ADMIN_MENU_KEYS.map((menu) => {
  const keys = ADMIN_PERMISSIONS.filter((p) => p.menu === menu).map((p) => p.key);
  return {
    key: menu,
    label: MENU_LABEL[menu],
    view: keys.find((k) => k === `${menu}.view`) ?? null,
    keys,
  };
});

/** 5 vai trò hệ thống (RB-R04) — `admin_roles.key` cố định */
export const ADMIN_SYSTEM_ROLE_KEYS = [
  'super_admin',
  'admin',
  'lecturer',
  'accountant',
  'editor',
] as const;
export type AdminSystemRoleKey = (typeof ADMIN_SYSTEM_ROLE_KEYS)[number];

/** Tên + mô tả vai trò hệ thống (prototype `ADM_ROLES0`) */
export const ADMIN_SYSTEM_ROLES: readonly {
  key: AdminSystemRoleKey;
  name: string;
  description: string;
}[] = [
  {
    key: 'super_admin',
    name: 'Super Admin',
    description: 'Toàn quyền hệ thống, không thể chỉnh sửa',
  },
  { key: 'admin', name: 'Quản trị viên', description: 'Vận hành toàn bộ nghiệp vụ cộng đồng' },
  {
    key: 'lecturer',
    name: 'Giảng viên',
    description: 'Đào tạo, tổ chức sự kiện/workshop, hỗ trợ thành viên trong nhóm',
  },
  {
    key: 'accountant',
    name: 'Kế toán',
    description: 'Phí thành viên, đối soát & chi trả hoa hồng affiliate',
  },
  { key: 'editor', name: 'Biên tập nội dung', description: 'Sự kiện, dự án, bot tương tác' },
];

/**
 * Ma trận mặc định §21.2 (prototype `ADM_DEF`). Super Admin không lưu dòng — luôn đủ 25 khoá.
 * Quản trị viên không có `affiliate.payout`, `settings.admins`.
 */
export const DEFAULT_ADMIN_ROLE_PERMISSIONS: Record<
  Exclude<AdminSystemRoleKey, 'super_admin'>,
  readonly AdminPermissionKey[]
> = {
  admin: ADMIN_PERMISSION_KEYS.filter((k) => k !== 'affiliate.payout' && k !== 'settings.admins'),
  lecturer: [
    'overview.view',
    'members.view',
    'groups.view',
    'groups.action',
    'groups.moderate',
    'events.view',
    'events.action',
  ],
  accountant: [
    'overview.view',
    'members.view',
    'fees.view',
    'fees.action',
    'services.view',
    'affiliate.view',
    'affiliate.action',
    'affiliate.payout',
    'settings.log',
  ],
  editor: [
    'overview.view',
    'groups.view',
    'bots.view',
    'bots.action',
    'events.view',
    'events.action',
    'projects.view',
    'projects.action',
  ],
};

/** Quyền thực tế của vai trò: Super Admin luôn đủ 25 khoá (RB-R05) */
export const effectiveAdminGrants = (
  roleKey: string | null,
  stored: readonly AdminPermissionKey[],
): AdminPermissionKey[] =>
  roleKey === 'super_admin'
    ? [...ADMIN_PERMISSION_KEYS]
    : ADMIN_PERMISSION_KEYS.filter((k) => stored.includes(k));

/**
 * Khoá Xem của menu chứa `key` (RB-R07): thiếu khoá thao tác mà có khoá này → "chỉ xem" (`VIEW_ONLY`).
 * Khoá Xem tự nó, và khoá của menu không có khoá Xem chung (Cài đặt — V2Q-112) → `null`.
 */
export function viewKeyOf(key: AdminPermissionKey): AdminPermissionKey | null {
  const menu = ADMIN_MENUS.find((m) => m.keys.includes(key));
  return menu?.view && menu.view !== key ? menu.view : null;
}

/** Quyền thực tế của phiên (luật 4: chỉ kiểm khoá, không so tên vai trò) */
export const can = (grants: readonly string[], key: AdminPermissionKey): boolean =>
  grants.includes(key);
