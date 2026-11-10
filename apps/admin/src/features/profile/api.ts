import {
  adminMeSchema,
  adminLoginResponseSchema,
  type AdminUpdateProfileRequest,
  type AdminChangePasswordRequest,
} from '@opchub/shared/api';
import { api } from '@/lib/api-client';

export const updateProfile = (body: AdminUpdateProfileRequest) =>
  api('/admin/auth/me', { method: 'PATCH', body, schema: adminMeSchema });
export const changePassword = (body: AdminChangePasswordRequest) =>
  api('/admin/auth/change-password', { method: 'POST', body, schema: adminLoginResponseSchema });
