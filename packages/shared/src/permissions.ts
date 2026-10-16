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
