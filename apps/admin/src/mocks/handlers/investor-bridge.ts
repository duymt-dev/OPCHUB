import {
  EVENT_BRIDGE_COOKIE,
  INVESTOR_BRIDGE_COOKIE,
  SERVICE_BRIDGE_COOKIE,
  syncEventBridge,
  syncInvestorBridge,
  syncServiceBridge,
} from '@opchub/shared/mock-domains';
import { http } from 'msw/http';
import { API } from './util';

/**
 * Quan tâm đầu tư dùng chung giữa Portal và Admin ở chế độ MSW (D-63, D-72): hai app
 * khác cổng nhưng cùng host nên chung `document.cookie` (cookie không phân biệt cổng). Kho cookie
 * nội bộ của MSW tách theo origin nên đọc/ghi thẳng `document.cookie`; test node dùng header.
 */
function readCookie(cookies: Record<string, string>, name: string): string | undefined {
  if (typeof document === 'undefined') return cookies[name];
  const hit = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return hit?.slice(name.length + 1);
}
const readBridge = (cookies: Record<string, string>) => readCookie(cookies, INVESTOR_BRIDGE_COOKIE);

/** Đầu mỗi request: gộp dữ liệu app kia đã ghi (như cùng đọc `investor_interests` trên server) */
export const investorBridgeHandlers = [
  http.all(`${API}/*`, ({ cookies }) => {
    syncInvestorBridge(readBridge(cookies));
    // AT-LK05: phiếu tư vấn Portal vừa gửi hiện ở Admin › Dịch vụ
    syncServiceBridge(readCookie(cookies, SERVICE_BRIDGE_COOKIE));
    // Đồng bộ người đăng ký sự kiện từ Portal sang Admin
    syncEventBridge(readCookie(cookies, EVENT_BRIDGE_COOKIE));
    return undefined;
  }),
];
