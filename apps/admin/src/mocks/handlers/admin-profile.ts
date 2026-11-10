import { adminChangePasswordSchema, adminUpdateProfileSchema } from '@opchub/shared/api';
import {
  listMockAdminAccounts,
  getSecuritySettings,
  mockAdminMeOf,
  mockAdminPassword,
  changeMockAdminPassword,
  updateMockAdminProfile,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { parseBody, userIdOf } from './domain-util';
import { API, apiError } from './util';
import { mockAdminSessionResponse } from './mock-admin-session';
import { isMockAdminAvatar } from './uploads';

function guard(request: Request) {
  if (!/^Bearer mock\.[\w-]+$/.test(request.headers.get('Authorization') ?? '')) {
    return apiError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập');
  }
  const id = userIdOf(request);
  const account = listMockAdminAccounts().find((a) => a.id === id);
  if (!account) return apiError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập');
  if (account.status !== 'active')
    return apiError(403, 'FORBIDDEN', 'Tài khoản quản trị đã bị khóa');
  const me = mockAdminMeOf(id, getSecuritySettings().requireAdmin2fa);
  if (me?.mustChangePassword)
    return apiError(403, 'PASSWORD_CHANGE_REQUIRED', 'Vui lòng đổi mật khẩu tạm');
  if (me?.twoFactorRequired)
    return apiError(
      403,
      'TWO_FACTOR_SETUP_REQUIRED',
      'Vui lòng bật xác thực 2 lớp trước khi tiếp tục',
    );
  return null;
}

export const adminProfileHandlers = [
  http.patch(`${API}/admin/auth/me`, async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    const body = await parseBody(request, adminUpdateProfileSchema);
    if (!body.ok) return body.res;
    const id = userIdOf(request);
    if (!isMockAdminAvatar(body.data.avatarUrl, id, mockAdminMeOf(id)?.avatarUrl ?? null)) {
      const message = 'Ảnh không hợp lệ';
      return apiError(400, 'VALIDATION_ERROR', message, [{ path: 'avatarUrl', message }]);
    }
    updateMockAdminProfile(id, body.data);
    return HttpResponse.json(mockAdminMeOf(id));
  }),
  http.post(`${API}/admin/auth/change-password`, async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    const parsed = adminChangePasswordSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      return apiError(
        400,
        'VALIDATION_ERROR',
        'Dữ liệu không hợp lệ',
        parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      );
    const id = userIdOf(request);
    if (parsed.data.currentPassword !== mockAdminPassword(id)) {
      const message = 'Mật khẩu hiện tại không đúng';
      return apiError(400, 'VALIDATION_ERROR', message, [{ path: 'currentPassword', message }]);
    }
    changeMockAdminPassword(id, parsed.data.newPassword);
    return mockAdminSessionResponse(id);
  }),
];
