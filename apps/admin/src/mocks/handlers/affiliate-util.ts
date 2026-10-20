import type { AdminPermissionKey } from '@opchub/shared';
import {
  getSecuritySettings,
  listMockAdminAccounts,
  mockAdminMeOf,
} from '@opchub/shared/mock-domains';
import { userIdOf } from './domain-util';
import { apiError } from './util';

export function affiliateAdminGuard(request: Request, key: AdminPermissionKey): Response | null {
  if (!/^Bearer mock\..+$/.test(request.headers.get('Authorization') ?? ''))
    return apiError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập');
  const id = userIdOf(request);
  const account = listMockAdminAccounts().find((row) => row.id === id);
  const admin = mockAdminMeOf(id, getSecuritySettings().requireAdmin2fa);
  if (!admin || account?.status !== 'active')
    return apiError(401, 'UNAUTHORIZED', 'Phiên đã hết hạn');
  if (admin.mustChangePassword)
    return apiError(403, 'PASSWORD_CHANGE_REQUIRED', 'Vui lòng đổi mật khẩu trước');
  if (admin.twoFactorRequired)
    return apiError(403, 'TWO_FACTOR_SETUP_REQUIRED', 'Vui lòng thiết lập xác thực hai bước');
  return admin.permissions.includes(key)
    ? null
    : apiError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này');
}
