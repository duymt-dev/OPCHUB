import {
  EVENT_BRIDGE_COOKIE,
  eventBridgeCookie,
  INVESTOR_BRIDGE_COOKIE,
  investorBridgeCookie,
  resolveMemberInfo,
  SERVICE_BRIDGE_COOKIE,
  serviceBridgeCookie,
  syncEventBridge,
  syncInvestorBridge,
} from '@opchub/shared/mock-domains';
import type { ServiceRequest } from '@opchub/shared/api-domains';
import { http } from 'msw/http';
import { API } from './util';

type Add = Parameters<typeof investorBridgeCookie>[1];

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
    syncEventBridge(readCookie(cookies, EVENT_BRIDGE_COOKIE));
    return undefined;
  }),
];

/** Chép lượt đăng ký sự kiện sang Admin (cùng cơ chế cookie) */
export function bridgedEvent(
  res: Response,
  cookies: Record<string, string>,
  mark: { eventId: string; userId: string; registered: boolean },
): Response {
  if (!res.ok) return res;
  const raw = readCookie(cookies, EVENT_BRIDGE_COOKIE);
  const info = resolveMemberInfo(mark.userId);
  const c = eventBridgeCookie(raw, {
    ...mark,
    at: new Date().toISOString(),
    fullName: info.fullName,
    email: info.email,
    phone: info.phone,
    org: info.org,
  });
  if (typeof document === 'undefined') res.headers.append('Set-Cookie', c);
  else document.cookie = c;
  return res;
}

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
