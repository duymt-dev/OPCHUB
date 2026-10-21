import { ACCOUNT_LOCKED_MESSAGE } from '@opchub/shared';
import {
  mockMemberEpoch,
  mockMemberStatus,
  parseMockMemberToken,
} from '@opchub/shared/mock-domains';
import { http } from 'msw/http';
import { apiError, API } from './util';

/** Cookie chỉ dùng cho mock/test: giả lập Admin vừa khoá TK đang đăng nhập (NA-16, UAT-24) */
const LOCKED_COOKIE = 'opchub-mock-locked';

/**
 * MSW không có socket để đẩy `session.revoked`: khi cookie bật, request kế tiếp ngoài `/auth/*`
 * nhận 403 khoá như guard thật → client về `/login?reason=locked` (cùng màn kết quả với server).
 */
export const sessionHandlers = [
  http.all(`${API}/*`, ({ cookies, request }) => {
    const path = new URL(request.url).pathname;
    // Như server: đăng nhập / cài đặt công khai không qua guard phiên
    const protectedAuth =
      path === `${API}/auth/password/change` || path.startsWith(`${API}/auth/sessions/`);
    if ((path.startsWith(`${API}/auth/`) && !protectedAuth) || path.startsWith(`${API}/public/`))
      return undefined;
    const raw = request.headers.get('Authorization');
    const token = raw
      ? parseMockMemberToken(raw.replace(/^Bearer /, ''))
      : { userId: 'm1', epoch: 0 };
    if (!token) return apiError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập');
    if (cookies[LOCKED_COOKIE] === '1' || mockMemberStatus(token.userId) === 'locked')
      return apiError(403, 'FORBIDDEN', ACCOUNT_LOCKED_MESSAGE);
    if (token.epoch !== mockMemberEpoch(token.userId))
      return apiError(401, 'UNAUTHORIZED', 'Phiên đăng nhập đã thay đổi, vui lòng đăng nhập lại');
    return undefined;
  }),
];
