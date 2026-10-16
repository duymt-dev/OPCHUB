import {
  changePasswordSchema,
  presignRequestSchema,
  PROFILE_MESSAGES,
  updateProfileSchema,
} from '@opchub/shared/api-domains';
import {
  changePassword,
  getProfile,
  revokeOtherSessions,
  setSsoLink,
  updateProfile,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { param, parseBody, reply, userIdOf } from './domain-util';
import { apiError, API } from './util';

/** Ảnh đã "tải lên" trong phiên MSW (giả MinIO) */
const uploads = new Map<string, { type: string; body: ArrayBuffer }>();

/**
 * SRS §13 `GET/PATCH /me` + bổ sung (Q-G3c-1): đổi mật khẩu, đăng xuất thiết bị khác,
 * liên kết SSO, presigned upload ảnh đại diện (MSW giả MinIO).
 */
export const profileHandlers = [
  http.get(`${API}/me`, ({ request }) => reply(getProfile(userIdOf(request)))),
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
  http.delete(`${API}/me/sso/:provider`, ({ request, params }) =>
    reply(setSsoLink(userIdOf(request), param(params, 'provider'), false)),
  ),
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
