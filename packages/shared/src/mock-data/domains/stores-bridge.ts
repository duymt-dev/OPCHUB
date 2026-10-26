import type { StoreStatus } from '../../api-domains';
import { mockStores } from './stores';

/**
 * Cầu Portal ↔ Admin (MSW, cùng host khác cổng): chép TRẠNG THÁI gian hàng đã đổi (xuất bản / về
 * nháp ở Portal, ẩn / hiện ở Admin) — bản `at` mới hơn thắng. Nội dung sửa ở Portal không chép
 * (Admin chỉ cần trạng thái để kiểm duyệt; giới hạn 4 KB của cookie).
 */
export const STORE_BRIDGE_COOKIE = 'opchub-mock-st';
const MAX_COOKIE = 3800;

interface Mark {
  id: string;
  status: StoreStatus;
  prev: Exclude<StoreStatus, 'hidden'> | null;
  at: string;
}

function decode(raw: string | undefined): Mark[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(decodeURIComponent(raw));
    return Array.isArray(v) ? (v as Mark[]) : [];
  } catch {
    return [];
  }
}

export function syncStoreBridge(raw: string | undefined): void {
  const rows = mockStores();
  for (const m of decode(raw)) {
    const r = rows.find((x) => x.id === m.id);
    if (!r || r.updatedAt >= m.at) continue;
    Object.assign(r, { status: m.status, hiddenPrev: m.prev, updatedAt: m.at });
  }
}

/** Ghi các gian hàng có trạng thái khác mốc seed (đổi trong phiên này hoặc nhận qua cầu) */
export function storeBridgeCookie(raw: string | undefined, changedIds: readonly string[]): string {
  const rows = mockStores();
  const marks = new Map(decode(raw).map((m) => [m.id, m]));
  for (const id of changedIds) {
    const r = rows.find((x) => x.id === id);
    if (r) marks.set(id, { id, status: r.status, prev: r.hiddenPrev, at: r.updatedAt });
  }
  const list = [...marks.values()];
  let v = encodeURIComponent(JSON.stringify(list));
  while (v.length > MAX_COOKIE && list.length > 1) {
    list.shift();
    v = encodeURIComponent(JSON.stringify(list));
  }
  return `${STORE_BRIDGE_COOKIE}=${v}; Path=/`;
}
