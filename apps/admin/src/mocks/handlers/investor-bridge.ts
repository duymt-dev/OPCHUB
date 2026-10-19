import {
  INVESTOR_BRIDGE_COOKIE,
  investorBridgeCookie,
  syncInvestorBridge,
} from '@opchub/shared/mock-domains';
import { http } from 'msw/http';
import { API } from './util';

type Add = Parameters<typeof investorBridgeCookie>[1];

/**
 * Luồng nhà đầu tư dùng chung giữa Portal và Admin ở chế độ MSW (TIP-V2-107, D-63, V2Q-72): hai app
 * khác cổng nhưng cùng host nên chung `document.cookie` (cookie không phân biệt cổng). Kho cookie
 * nội bộ của MSW tách theo origin nên đọc/ghi thẳng `document.cookie`; test node dùng header.
 */
function readBridge(cookies: Record<string, string>): string | undefined {
  if (typeof document === 'undefined') return cookies[INVESTOR_BRIDGE_COOKIE];
  const hit = document.cookie.split('; ').find((c) => c.startsWith(`${INVESTOR_BRIDGE_COOKIE}=`));
  return hit?.slice(INVESTOR_BRIDGE_COOKIE.length + 1);
}

/** Đầu mỗi request: gộp dữ liệu app kia đã ghi (như cùng đọc `investor_comments` trên server) */
export const investorBridgeHandlers = [
  http.all(`${API}/*`, ({ cookies }) => {
    syncInvestorBridge(readBridge(cookies));
    return undefined;
  }),
];

/** Chép bản ghi vừa ghi sang app kia */
export function bridged(res: Response, cookies: Record<string, string>, add: Add): Response {
  if (!res.ok) return res;
  const c = investorBridgeCookie(readBridge(cookies), add);
  if (!c) return res;
  if (typeof document === 'undefined') res.headers.append('Set-Cookie', c);
  else document.cookie = c;
  return res;
}
