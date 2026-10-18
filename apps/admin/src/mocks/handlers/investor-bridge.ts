import {
  INVESTOR_BRIDGE_COOKIE,
  investorBridgeCookie,
  syncInvestorBridge,
} from '@opchub/shared/mock-domains';
import { http } from 'msw/http';
import { API } from './util';

type Add = Parameters<typeof investorBridgeCookie>[1];

/**
 * Luồng nhà đầu tư dùng chung giữa Portal và Admin ở chế độ MSW (TIP-V2-107, D-63): đầu mỗi request
 * gộp dữ liệu app kia đã chép vào cookie (như cùng đọc `investor_comments` trên server).
 */
export const investorBridgeHandlers = [
  http.all(`${API}/*`, ({ cookies }) => {
    syncInvestorBridge(cookies[INVESTOR_BRIDGE_COOKIE]);
    return undefined;
  }),
];

/** Gắn `Set-Cookie` chép bản ghi vừa ghi sang app kia */
export function bridged(res: Response, cookies: Record<string, string>, add: Add): Response {
  const c = investorBridgeCookie(cookies[INVESTOR_BRIDGE_COOKIE], add);
  if (c && res.ok) res.headers.append('Set-Cookie', c);
  return res;
}
