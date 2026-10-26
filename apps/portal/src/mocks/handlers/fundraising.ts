import {
  confirmMockFundraising,
  FUNDRAISING_BRIDGE_COOKIE,
  fundraisingBridgeCookie,
  MOCK_WEBHOOK_DELAY_MS,
  myMockFundraisings,
  settleMockFundraising,
  startMockFundraising,
  syncFundraisingBridge,
} from '@opchub/shared/mock-domains';
import { http } from 'msw/http';
import { param, reply, userIdOf } from './domain-util';
import { API, apiError } from './util';

/**
 * V4-610 Gói Gọi vốn (MSW). Trạng thái chung với Admin qua cookie `opchub-mock-gv` (cùng host,
 * như cầu nhà đầu tư): đọc thẳng `document.cookie` vì kho cookie của MSW tách theo cổng.
 */
function readCookie(cookies: Record<string, string>): string | undefined {
  if (typeof document === 'undefined') return cookies[FUNDRAISING_BRIDGE_COOKIE];
  const hit = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${FUNDRAISING_BRIDGE_COOKIE}=`));
  return hit?.slice(FUNDRAISING_BRIDGE_COOKIE.length + 1);
}

function writeCookie(cookies: Record<string, string>, res: Response): Response {
  const c = fundraisingBridgeCookie(readCookie(cookies));
  if (typeof document === 'undefined') res.headers.append('Set-Cookie', c);
  else document.cookie = c;
  return res;
}

export const fundraisingHandlers = [
  /** Đầu mỗi request: gộp khoản Admin vừa duyệt / từ chối */
  http.all(`${API}/*`, ({ cookies }) => {
    syncFundraisingBridge(readCookie(cookies));
    return undefined;
  }),
  http.post(`${API}/projects/:id/fundraising`, ({ request, params, cookies }) =>
    writeCookie(cookies, reply(startMockFundraising(userIdOf(request), param(params, 'id')))),
  ),
  http.get(`${API}/me/fundraisings`, ({ request }) =>
    reply({ ok: true, data: myMockFundraisings(userIdOf(request)) }),
  ),
  /** D-31: ghi nhận; webhook ngân hàng giả về trễ → chờ Admin thẩm định */
  http.post(`${API}/me/fundraisings/:id/transfer-confirm`, ({ request, params, cookies }) => {
    if (!request.headers.get('Idempotency-Key'))
      return apiError(400, 'VALIDATION_ERROR', 'Thiếu header Idempotency-Key');
    const id = param(params, 'id');
    const r = confirmMockFundraising(userIdOf(request), id);
    if (r.ok && r.data.awaitingWebhook) {
      setTimeout(() => {
        if (settleMockFundraising(id) && typeof document !== 'undefined')
          document.cookie = fundraisingBridgeCookie(readCookie({}));
      }, MOCK_WEBHOOK_DELAY_MS);
    }
    return writeCookie(cookies, reply(r, 202));
  }),
];
