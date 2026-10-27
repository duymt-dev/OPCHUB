import { fundraisingReviewSchema } from '@opchub/shared/api-domains';
import {
  FUNDRAISING_BRIDGE_COOKIE,
  fundraisingBridgeCookie,
  reviewMockFundraising,
  syncFundraisingBridge,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { param, parseBody, reply, userIdOf } from './domain-util';
import { API } from './util';

/**
 * V4-610 (AD-06): Admin thẩm định Gói Gọi vốn ở MSW. Khoản do Portal tạo đến qua cookie
 * `opchub-mock-gv` (cùng host, khác cổng — đọc `document.cookie`); quyết định chép ngược lại.
 */
function readCookie(cookies: Record<string, string>): string | undefined {
  if (typeof document === 'undefined') return cookies[FUNDRAISING_BRIDGE_COOKIE];
  const hit = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${FUNDRAISING_BRIDGE_COOKIE}=`));
  return hit?.slice(FUNDRAISING_BRIDGE_COOKIE.length + 1);
}

/** Chép trạng thái Gọi vốn MSW sang cookie bridge cho Portal (sau duyệt / khớp tay) */
export function writeFundraisingBridge(cookies: Record<string, string>, res: Response): void {
  const c = fundraisingBridgeCookie(readCookie(cookies));
  if (typeof document === 'undefined') res.headers.append('Set-Cookie', c);
  else document.cookie = c;
}

export const adminFundraisingHandlers = [
  http.all(`${API}/*`, ({ cookies }) => {
    syncFundraisingBridge(readCookie(cookies));
    return undefined;
  }),
  http.post(
    `${API}/admin/projects/:id/fundraising/:fid/review`,
    async ({ request, params, cookies }) => {
      const body = await parseBody(request, fundraisingReviewSchema);
      if (!body.ok) return body.res;
      const r = reviewMockFundraising(
        userIdOf(request),
        param(params, 'id'),
        param(params, 'fid'),
        body.data.decision,
      );
      if (!r.ok) return reply(r);
      const res = new HttpResponse(null, { status: 204 });
      writeFundraisingBridge(cookies, res);
      return res;
    },
  ),
];
