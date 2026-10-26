import {
  INVESTOR_BRIDGE_COOKIE,
  investorBridgeCookie,
  SERVICE_BRIDGE_COOKIE,
  serviceBridgeCookie,
  syncInvestorBridge,
} from '@opchub/shared/mock-domains';
import type { ServiceRequest } from '@opchub/shared/api-domains';
import { http } from 'msw/http';
import { API } from './util';

type Add = Parameters<typeof investorBridgeCookie>[1];

/**
 * Quan tâm đầu tư dùng chung giữa Portal và Admin ở chế độ MSW (D-63, D-72): hai app
 * khác cổng nhưng cùng host nên chung `document.cookie` (cookie không phân biệt cổng). Kho cookie
 * nội bộ của MSW tách theo origin nên đọc/ghi thẳng `document.cookie`; test node dùng header.
 */
function readBridge(cookies: Record<string, string>): string | undefined {
  if (typeof document === 'undefined') return cookies[INVESTOR_BRIDGE_COOKIE];
  const hit = document.cookie.split('; ').find((c) => c.startsWith(`${INVESTOR_BRIDGE_COOKIE}=`));
  return hit?.slice(INVESTOR_BRIDGE_COOKIE.length + 1);
}

/** Đầu mỗi request: gộp dữ liệu app kia đã ghi (như cùng đọc `investor_interests` trên server) */
export const investorBridgeHandlers = [
  http.all(`${API}/*`, ({ cookies }) => {
    syncInvestorBridge(readBridge(cookies));
    return undefined;
  }),
];

/** AT-LK05: chép phiếu tư vấn vừa tạo sang Admin (cùng cơ chế cookie) */
export function bridgedRequest(res: Response, cookies: Record<string, string>, r: ServiceRequest) {
  if (!res.ok) return res;
  const raw =
    typeof document === 'undefined'
      ? cookies[SERVICE_BRIDGE_COOKIE]
      : document.cookie
          .split('; ')
          .find((c) => c.startsWith(`${SERVICE_BRIDGE_COOKIE}=`))
          ?.slice(SERVICE_BRIDGE_COOKIE.length + 1);
  const c = serviceBridgeCookie(raw, r);
  if (typeof document === 'undefined') res.headers.append('Set-Cookie', c);
  else document.cookie = c;
  return res;
}

/** Chép bản ghi vừa ghi sang app kia */
export function bridged(res: Response, cookies: Record<string, string>, add: Add): Response {
  if (!res.ok) return res;
  const c = investorBridgeCookie(readBridge(cookies), add);
  if (!c) return res;
  if (typeof document === 'undefined') res.headers.append('Set-Cookie', c);
  else document.cookie = c;
  return res;
}
