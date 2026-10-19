import { z } from 'zod';

/**
 * Phiên Admin (TIP-V2-202, D-62, RB-R03): đăng nhập qua `admin_users`, tách hẳn phiên thành viên.
 * SEC-R01 đổi mật khẩu tạm lần đầu, SEC-R02 2FA, NA-15 khoá tạm, RB-R08 khoá TK quản trị.
 */

export const ADMIN_AUTH_MESSAGES = {
  badCredentials: 'Email hoặc mật khẩu không đúng',
  locked: 'Tài khoản quản trị đã bị khóa',
  wrongPortal: 'Tài khoản này đăng nhập ở cổng khác',
  weakPassword: 'Mật khẩu mới tối thiểu 8 ký tự, có chữ hoa và chữ số',
  mismatch: 'Mật khẩu nhập lại không khớp',
  sameAsTemp: 'Mật khẩu mới phải khác mật khẩu tạm',
  passwordChangeRequired: 'Vui lòng đổi mật khẩu tạm trước khi tiếp tục',
  twoFactorRequired: 'Vui lòng bật xác thực 2 lớp trước khi tiếp tục',
  ssoForbidden: 'Tài khoản quản trị không đăng nhập bằng SSO',
  notChangeRequired: 'Tài khoản không cần đổi mật khẩu tạm',
  twoFactorEnabled: 'Xác thực 2 lớp đã được bật',
  twoFactorSetupExpired: 'Phiên thiết lập 2FA đã hết hạn, vui lòng thiết lập lại',
  codeInvalid: 'Mã xác thực không đúng',
} as const;

/** SEC-R01 (`_cpSave` prototype): ≥ 8 ký tự, có chữ hoa và chữ số */
export const ADMIN_PASSWORD_MIN = 8;
export const isStrongAdminPassword = (v: string): boolean =>
  v.length >= ADMIN_PASSWORD_MIN && /[A-Z]/.test(v) && /\d/.test(v);

export const adminMeSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  roleId: z.string().nullable(),
  roleName: z.string().nullable(),
  isSuperAdmin: z.boolean(),
  /** Khoá RBAC thực tế (Super Admin = 25 khoá) */
  permissions: z.array(z.string()),
  /** SEC-R01: phiên hạn chế tới khi đổi mật khẩu tạm */
  mustChangePassword: z.boolean(),
  twoFactor: z.boolean(),
  /** SEC-R02: "Yêu cầu 2FA" bật mà TK chưa thiết lập → phiên hạn chế */
  twoFactorRequired: z.boolean(),
});
export type AdminMe = z.infer<typeof adminMeSchema>;

/** Phiên Admin FE (TIP-V2-204): quyền tính từ `admin.permissions`, không còn `me.systemRole` */
export const adminLoginResponseSchema = z.object({
  accessToken: z.string(),
  admin: adminMeSchema,
});
export type AdminLoginResponse = z.infer<typeof adminLoginResponseSchema>;

export const adminFirstPasswordSchema = z.object({
  newPassword: z.string().min(1, 'Vui lòng nhập mật khẩu mới').max(128),
  confirmPassword: z.string().max(128),
});
export type AdminFirstPasswordRequest = z.infer<typeof adminFirstPasswordSchema>;

export const adminTwoFactorSetupSchema = z.object({
  otpauthUrl: z.string(),
  secretMasked: z.string(),
});
export type AdminTwoFactorSetup = z.infer<typeof adminTwoFactorSetupSchema>;

export const adminTwoFactorEnableSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Vui lòng nhập đủ 6 chữ số'),
});
export type AdminTwoFactorEnableRequest = z.infer<typeof adminTwoFactorEnableSchema>;
