import type { InvestorInterest } from '../../api-domains';
import { mockDb } from './store';

/**
 * Chỉ cho MSW/e2e (D-63): Portal và Admin là hai app, mỗi app một CSDL giả trong bộ nhớ, nhưng cùng
 * host nên chung cookie. Quan tâm đầu tư vừa ghi được chép vào cookie này; app kia gộp vào kho của
 * mình ở request kế tiếp (theo id, idempotent) — như hai app cùng đọc `investor_interests` trên
 * server. D-72: không còn luồng trao đổi nên cầu chỉ chở quan tâm.
 */
export const INVESTOR_BRIDGE_COOKIE = 'opchub-mock-iv';
const MAX_COOKIE = 3800;

interface Bridge {
  interests: InvestorInterest[];
}

function decode(raw: string | undefined): Bridge {
  if (!raw) return { interests: [] };
  try {
    // MSW đã giải mã cookie; vẫn nhận bản còn mã hoá (đọc thẳng document.cookie)
    const text = raw.startsWith('%7B') ? decodeURIComponent(raw) : raw;
    const v = JSON.parse(text) as Partial<Bridge>;
    return { interests: Array.isArray(v.interests) ? v.interests : [] };
  } catch {
    return { interests: [] };
  }
}

/** Gộp dữ liệu app kia đã ghi (gọi đầu mỗi request MSW) */
export function syncInvestorBridge(raw: string | undefined): void {
  const db = mockDb();
  for (const i of decode(raw).interests) {
    if (!db.interests.some((x) => x.id === i.id)) db.interests.unshift(i);
  }
}

/**
 * `Set-Cookie` sau khi ghi: cookie cũ + quan tâm mới, bỏ bớt bản cũ nhất nếu vượt ~4 KB.
 * Trả `undefined` khi không có gì để chép.
 */
export function investorBridgeCookie(
  raw: string | undefined,
  add: { interest?: InvestorInterest },
): string | undefined {
  const b = decode(raw);
  if (add.interest && !b.interests.some((x) => x.id === add.interest?.id)) {
    b.interests.push(add.interest);
  }
  let v = encodeURIComponent(JSON.stringify(b));
  while (v.length > MAX_COOKIE && b.interests.length > 1) {
    b.interests.shift();
    v = encodeURIComponent(JSON.stringify(b));
  }
  return v.length > MAX_COOKIE ? undefined : `${INVESTOR_BRIDGE_COOKIE}=${v}; Path=/`;
}
