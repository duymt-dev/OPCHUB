import {
  type AdminFirstPasswordRequest,
  adminLoginResponseSchema,
  adminMeSchema,
  adminTwoFactorSetupSchema,
} from '@opchub/shared/api';
import type { LoginRequest, ResetPasswordRequest } from '@opchub/shared/api';
import { z } from 'zod';
import { api } from '@/lib/api-client';

const empty = z.null();

/** D-62 (TIP-V2-202): phiên quản trị riêng (`admin_users`, cookie `opchub_art`) */
export const login = (body: LoginRequest) =>
  api('/admin/auth/login', { method: 'POST', body, schema: adminLoginResponseSchema });

/** D-27 bước 2: mã TOTP sau khi mật khẩu đúng */
export const verifyTotp = (mfaToken: string, code: string) =>
  api('/admin/auth/totp/verify', {
    method: 'POST',
    body: { mfaToken, code },
    schema: adminLoginResponseSchema,
  });

export const logout = () => api('/admin/auth/logout', { method: 'POST', schema: empty });

export const fetchAdminMe = () => api('/admin/auth/me', { schema: adminMeSchema });

/** SEC-R01: đổi mật khẩu tạm — trả phiên mới (đủ quyền) */
export const changeFirstPassword = (body: AdminFirstPasswordRequest) =>
  api('/admin/auth/first-password', { method: 'POST', body, schema: adminLoginResponseSchema });

/** SEC-R02: tạo khoá TOTP chờ xác nhận (10 phút) */
export const setupTwoFactor = () =>
  api('/admin/auth/2fa/setup', { method: 'POST', schema: adminTwoFactorSetupSchema });

export const enableTwoFactor = (code: string) =>
  api('/admin/auth/2fa/enable', {
    method: 'POST',
    body: { code },
    schema: adminLoginResponseSchema,
  });

export const forgotPassword = (email: string) =>
  api('/auth/password/forgot', { method: 'POST', body: { email }, schema: empty });

/** QT-02: 204 khi đặt lại xong; link sai/hết hạn hoặc mật khẩu yếu → 400 */
export const resetPassword = (body: ResetPasswordRequest) =>
  api('/auth/password/reset', { method: 'POST', body, schema: empty });
