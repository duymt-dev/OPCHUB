import { ACCOUNT_LOCKED_MESSAGE } from '@opchub/shared';
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
    if (cookies[LOCKED_COOKIE] !== '1') return undefined;
    const path = new URL(request.url).pathname;
    // Như server: đăng nhập / cài đặt công khai không qua guard phiên
    if (path.startsWith(`${API}/auth/`) || path.startsWith(`${API}/public/`)) return undefined;
    return apiError(403, 'FORBIDDEN', ACCOUNT_LOCKED_MESSAGE);
  }),
];
