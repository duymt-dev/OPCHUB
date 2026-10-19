import { adminLoginResponseSchema } from '@opchub/shared/api';
import type { LoginRequest, ResetPasswordRequest } from '@opchub/shared/api';
import { z } from 'zod';
import { api } from '@/lib/api-client';

const empty = z.null();

/** D-62 (TIP-V2-202): phiên quản trị riêng (`admin_users`, cookie `opchub_art`) */
export const login = (body: LoginRequest) =>
  api('/admin/auth/login', { method: 'POST', body, schema: adminLoginResponseSchema });

export const logout = () => api('/admin/auth/logout', { method: 'POST', schema: empty });

export const forgotPassword = (email: string) =>
  api('/auth/password/forgot', { method: 'POST', body: { email }, schema: empty });

/** QT-02: 204 khi đặt lại xong; link sai/hết hạn hoặc mật khẩu yếu → 400 */
export const resetPassword = (body: ResetPasswordRequest) =>
  api('/auth/password/reset', { method: 'POST', body, schema: empty });
