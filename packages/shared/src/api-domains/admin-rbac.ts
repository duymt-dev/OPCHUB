import { z } from 'zod';
import { ADMIN_PERMISSION_KEYS, type AdminPermissionKey } from '../permissions';

/**
 * RBAC Admin (SRS-3.6 §21, D-52, TIP-V2-201): tài khoản quản trị tách khỏi thành viên, vai trò
 * hệ thống + tự tạo, ma trận 25 khoá. Tab "Tài khoản quản trị" + "Vai trò & phân quyền".
 */

export const adminPermissionKeySchema = z.enum(
  ADMIN_PERMISSION_KEYS as unknown as [AdminPermissionKey, ...AdminPermissionKey[]],
);

export const ADMIN_ACCOUNT_STATUSES = ['active', 'locked'] as const;
export type AdminAccountStatus = (typeof ADMIN_ACCOUNT_STATUSES)[number];

export const adminAccountRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  roleId: z.string().nullable(),
  roleName: z.string().nullable(),
  isSuperAdmin: z.boolean(),
  twoFactor: z.boolean(),
  status: z.enum(ADMIN_ACCOUNT_STATUSES),
  online: z.boolean(),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
});
export type AdminAccountRow = z.infer<typeof adminAccountRowSchema>;
export const adminAccountListSchema = z.object({ items: z.array(adminAccountRowSchema) });
export type AdminAccountList = z.infer<typeof adminAccountListSchema>;

export const ADMIN_TEMP_PASSWORD_MIN = 8;

export const ADMIN_RBAC_ERRORS = {
  nameRequired: 'Vui lòng nhập họ tên',
  emailInvalid: 'Email không hợp lệ',
  phoneInvalid: 'Số điện thoại không hợp lệ',
  passwordShort: `Mật khẩu tạm tối thiểu ${ADMIN_TEMP_PASSWORD_MIN} ký tự`,
  emailAdminTaken: 'Email đã thuộc tài khoản quản trị khác',
  emailMemberTaken: 'Email đã là tài khoản thành viên, vui lòng dùng email nội bộ riêng',
  roleNotFound: 'Không tìm thấy vai trò',
  roleSuperAdmin: 'Không thể gán vai trò Super Admin',
  roleNameTaken: 'Tên vai trò đã tồn tại',
  roleSystemLocked: 'Không thể sửa vai trò hệ thống',
  roleSystemDelete: 'Không xoá được vai trò hệ thống',
  roleInUse: (n: number) => `Vai trò đang có ${n} tài khoản, hãy đổi vai trò các tài khoản trước`,
  superAdminMatrix: 'Không thể chỉnh quyền Super Admin',
  superAdminProtected: 'Không thể thao tác trên tài khoản Super Admin',
  accountNotFound: 'Không tìm thấy tài khoản quản trị',
  statusUnchanged: 'Trạng thái tài khoản đã thay đổi, vui lòng tải lại',
} as const;

/** RB-R08: khoá / mở khoá TK quản trị */
export const adminAccountStatusSchema = z.object({
  status: z.enum(ADMIN_ACCOUNT_STATUSES),
  reason: z.string().trim().max(500).optional(),
});
export type AdminAccountStatusRequest = z.infer<typeof adminAccountStatusSchema>;

/** RB-R04: đổi vai trò TK quản trị (không gán Super Admin) */
export const adminAccountRoleSchema = z.object({ roleId: z.string().min(1) });
export type AdminAccountRoleRequest = z.infer<typeof adminAccountRoleSchema>;

/** Tạo TK quản trị (RB-R02, QT-RB-01) */
export const adminAccountCreateSchema = z.object({
  name: z.string().trim().min(1, ADMIN_RBAC_ERRORS.nameRequired).max(120),
  /** E.164, tuỳ chọn ('' = không nhập) */
  phone: z
    .string()
    .trim()
    .regex(/^(\+[1-9]\d{7,14})?$/, ADMIN_RBAC_ERRORS.phoneInvalid)
    .nullish()
    .transform((v) => v || null),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, ADMIN_RBAC_ERRORS.emailInvalid),
  roleId: z.string().min(1),
  password: z.string().min(ADMIN_TEMP_PASSWORD_MIN, ADMIN_RBAC_ERRORS.passwordShort).max(128),
});
export type AdminAccountCreate = z.input<typeof adminAccountCreateSchema>;
export type AdminAccountCreateParsed = z.output<typeof adminAccountCreateSchema>;

export const adminRoleSchema = z.object({
  id: z.string(),
  key: z.string().nullable(),
  name: z.string(),
  description: z.string(),
  isSystem: z.boolean(),
  accountCount: z.number().int().min(0),
  permissions: z.array(adminPermissionKeySchema),
});
export type AdminRoleRow = z.infer<typeof adminRoleSchema>;
export const adminRoleListSchema = z.object({ items: z.array(adminRoleSchema) });
export type AdminRoleList = z.infer<typeof adminRoleListSchema>;

/** Vai trò tự tạo: tên 2–60, mô tả ≤ 200 */
export const adminRoleCreateSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(200).default(''),
});
export type AdminRoleCreate = z.input<typeof adminRoleCreateSchema>;
export const adminRolePatchSchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    description: z.string().trim().max(200),
  })
  .partial()
  .refine((v) => v.name !== undefined || v.description !== undefined, 'Không có gì để cập nhật');
export type AdminRolePatch = z.infer<typeof adminRolePatchSchema>;

/** NA-28: `{ [roleId]: khoá[] }` cho mọi vai trò trừ Super Admin (≤ 50 vai trò) */
export const adminRoleMatrixSchema = z
  .record(z.string().min(1), z.array(adminPermissionKeySchema).max(ADMIN_PERMISSION_KEYS.length))
  .refine((m) => Object.keys(m).length > 0 && Object.keys(m).length <= 50, 'Ma trận không hợp lệ');
export type AdminRoleMatrix = z.infer<typeof adminRoleMatrixSchema>;
