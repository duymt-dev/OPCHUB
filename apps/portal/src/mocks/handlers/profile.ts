import {
  changePasswordSchema,
  emailChangeRequestSchema,
  emailChangeVerifySchema,
  presignRequestSchema,
  PROFILE_MESSAGES,
  updateProfileSchema,
} from '@opchub/shared/api-domains';
import {
  changePassword,
  getProfile,
  markSsoOnly,
  requestEmailChange,
  revokeOtherSessions,
  setSsoLink,
  updateProfile,
  verifyEmailChange,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { param, parseBody, reply, userIdOf } from './domain-util';
import { apiError, API } from './util';

/** Chỉ mock/e2e (BUG-030): TK hiện tại coi như chỉ đăng nhập qua Google, chưa đặt mật khẩu */
const SSO_ONLY_COOKIE = 'opchub-mock-sso-only';

const userOf = (request: Request, cookies: Record<string, string>) => {
  const id = userIdOf(request);
  if (cookies[SSO_ONLY_COOKIE] === '1') markSsoOnly(id);
  return id;
};

/** Ảnh đã "tải lên" trong phiên MSW (giả MinIO) */
const uploads = new Map<string, { type: string; body: ArrayBuffer }>();

/**
 * SRS §13 `GET/PATCH /me` + bổ sung (Q-G3c-1): đổi mật khẩu, đăng xuất thiết bị khác,
 * liên kết SSO, presigned upload ảnh đại diện (MSW giả MinIO).
 */
export const profileHandlers = [
  http.get(`${API}/me`, ({ request, cookies }) => reply(getProfile(userOf(request, cookies)))),
  http.patch(`${API}/me`, async ({ request }) => {
    const body = await parseBody(request, updateProfileSchema);
    if (!body.ok) return body.res;
    return reply(updateProfile(userIdOf(request), body.data));
  }),
  http.post(`${API}/auth/password/change`, async ({ request }) => {
    const body = await parseBody(request, changePasswordSchema);
    if (!body.ok) return body.res;
    return changePassword(userIdOf(request), body.data)
      ? new HttpResponse(null, { status: 204 })
      : apiError(400, 'VALIDATION_ERROR', PROFILE_MESSAGES.currentWrong);
  }),
  http.post(`${API}/auth/sessions/revoke-others`, () => reply(revokeOtherSessions())),
  http.post(`${API}/me/sso/:provider`, ({ request, params }) =>
    reply(setSsoLink(userIdOf(request), param(params, 'provider'), true)),
  ),
  http.delete(`${API}/me/sso/:provider`, ({ request, params, cookies }) =>
    reply(setSsoLink(userOf(request, cookies), param(params, 'provider'), false)),
  ),
  // BUG-030: đổi email đăng nhập qua OTP gửi tới email mới (mã cố định MOCK_OTP)
  http.post(`${API}/me/email/otp`, async ({ request }) => {
    const body = await parseBody(request, emailChangeRequestSchema);
    if (!body.ok) return body.res;
    return reply(requestEmailChange(userIdOf(request), body.data.newEmail));
  }),
  http.post(`${API}/me/email/verify`, async ({ request }) => {
    const body = await parseBody(request, emailChangeVerifySchema);
    if (!body.ok) return body.res;
    const r = verifyEmailChange(userIdOf(request), body.data.newEmail, body.data.code);
    return r ? reply(r) : apiError(422, 'OTP_INVALID', 'Mã OTP không đúng');
  }),
  http.post(`${API}/uploads/presign`, async ({ request }) => {
    const body = await parseBody(request, presignRequestSchema);
    if (!body.ok) return body.res;
    const key = `${body.data.kind}-${crypto.randomUUID()}`;
    const origin = new URL(request.url).origin;
    return HttpResponse.json({
      uploadUrl: `${origin}${API}/uploads/${key}`,
      publicUrl: `${origin}${API}/uploads/${key}`,
    });
  }),
  http.put(`${API}/uploads/:key`, async ({ request, params }) => {
    const type = request.headers.get('Content-Type') ?? 'image/png';
    uploads.set(param(params, 'key'), { type, body: await request.arrayBuffer() });
    return new HttpResponse(null, { status: 200 });
  }),
  http.get(`${API}/uploads/:key`, ({ params }) => {
    const file = uploads.get(param(params, 'key'));
    return file
      ? new HttpResponse(file.body, { headers: { 'Content-Type': file.type } })
      : apiError(404, 'NOT_FOUND', 'Không có ảnh');
  }),
];
