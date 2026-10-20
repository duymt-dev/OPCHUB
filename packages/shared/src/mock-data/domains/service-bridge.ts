import type { ServiceRequest } from '../../api-domains';
import { mockDb } from './store';

/**
 * Chỉ cho MSW/e2e (D-63, AT-LK05): phiếu tư vấn TV vừa gửi ở Portal phải hiện ở Admin › Dịch vụ.
 * Hai app chung cookie (cùng host) như cầu nhà đầu tư (`investor-bridge.ts`): Portal chép phiếu
 * vào cookie, Admin gộp vào kho của mình theo mã ở request kế tiếp (idempotent).
 */
export const SERVICE_BRIDGE_COOKIE = 'opchub-mock-yc';
const MAX_COOKIE = 3800;

function decode(raw: string | undefined): ServiceRequest[] {
  if (!raw) return [];
  try {
    const text = raw.startsWith('%5B') ? decodeURIComponent(raw) : raw;
    const v: unknown = JSON.parse(text);
    return Array.isArray(v) ? (v as ServiceRequest[]) : [];
  } catch {
    return [];
  }
}

/** Admin: gộp phiếu Portal đã gửi (đầu mỗi request MSW) */
export function syncServiceBridge(raw: string | undefined): void {
  const db = mockDb();
  for (const r of decode(raw)) {
    if (!db.serviceRequests.some((x) => x.code === r.code)) db.serviceRequests.unshift(r);
  }
}

/** Portal: `Set-Cookie` gồm phiếu cũ + phiếu mới; bỏ phiếu cũ nhất nếu vượt ~4 KB */
export function serviceBridgeCookie(raw: string | undefined, add: ServiceRequest): string {
  const list = decode(raw).filter((x) => x.code !== add.code);
  list.push(add);
  let v = encodeURIComponent(JSON.stringify(list));
  while (v.length > MAX_COOKIE && list.length > 1) {
    list.shift();
    v = encodeURIComponent(JSON.stringify(list));
  }
  return `${SERVICE_BRIDGE_COOKIE}=${v}; Path=/`;
}
