import type { InvestorInterest } from '../../api-domains';
import {
  notifyInvestorReplied,
  pushComment,
  type ThreadComment,
  threadStore,
} from './investor-thread';
import { mockDb } from './store';

/**
 * Chỉ cho MSW/e2e (D-63): Portal và Admin là hai app, mỗi app một CSDL giả trong bộ nhớ, nhưng cùng
 * host nên chung cookie. Quan tâm + tin trao đổi nhà đầu tư vừa ghi được chép vào cookie này; app
 * kia gộp vào kho của mình ở request kế tiếp (theo id, idempotent) — như hai app cùng đọc
 * `investor_comments` trên server. Tin Admin gộp vào Portal sinh thông báo `invest` (IV-R01).
 */
export const INVESTOR_BRIDGE_COOKIE = 'opchub-mock-iv';
const MAX_COOKIE = 3800;

interface Bridge {
  interests: InvestorInterest[];
  comments: ThreadComment[];
}

function decode(raw: string | undefined): Bridge {
  if (!raw) return { interests: [], comments: [] };
  try {
    // MSW đã giải mã cookie; vẫn nhận bản còn mã hoá (đọc thẳng document.cookie)
    const text = raw.startsWith('%7B') ? decodeURIComponent(raw) : raw;
    const v = JSON.parse(text) as Partial<Bridge>;
    return {
      interests: Array.isArray(v.interests) ? v.interests : [],
      comments: Array.isArray(v.comments) ? v.comments : [],
    };
  } catch {
    return { interests: [], comments: [] };
  }
}

/** Gộp dữ liệu app kia đã ghi (gọi đầu mỗi request MSW) */
export function syncInvestorBridge(raw: string | undefined): void {
  const b = decode(raw);
  const db = mockDb();
  for (const i of b.interests) {
    if (!db.interests.some((x) => x.id === i.id)) db.interests.unshift(i);
  }
  const store = threadStore();
  for (const c of b.comments) {
    if (store.some((x) => x.id === c.id)) continue;
    pushComment(c);
    if (!c.fromInvestor) notifyInvestorReplied(c);
  }
}

/**
 * `Set-Cookie` sau khi ghi: cookie cũ + bản ghi mới, bỏ bớt tin cũ nhất nếu vượt ~4 KB.
 * Trả `undefined` khi không có gì để chép.
 */
export function investorBridgeCookie(
  raw: string | undefined,
  add: { interest?: InvestorInterest; comment?: ThreadComment },
): string | undefined {
  const b = decode(raw);
  if (add.interest && !b.interests.some((x) => x.id === add.interest?.id)) {
    b.interests.push(add.interest);
  }
  if (add.comment && !b.comments.some((x) => x.id === add.comment?.id)) {
    b.comments.push(add.comment);
  }
  let v = encodeURIComponent(JSON.stringify(b));
  while (v.length > MAX_COOKIE && b.comments.length) {
    b.comments.shift();
    v = encodeURIComponent(JSON.stringify(b));
  }
  return v.length > MAX_COOKIE ? undefined : `${INVESTOR_BRIDGE_COOKIE}=${v}; Path=/`;
}
