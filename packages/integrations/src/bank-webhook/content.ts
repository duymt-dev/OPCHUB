/**
 * D-41: đối soát CHỈ theo Mã TV (`TV` + 6 số). Nội dung CK do người dùng gõ nên rất bẩn:
 * chữ thường, dính liền (`OPCHUBTV000123`), thêm SĐT, ngân hàng chèn tiền tố/hậu tố.
 * Cho phép một khoảng trắng / gạch giữa `TV` và số (`TV 000123`, `TV-000123`).
 * Mã phải đứng riêng phía trước: không lấy `TV` nằm giữa chữ khác (vd `ATV000123`)
 * — trừ khi ngay trước là `OPCHUB` (dính liền).
 */
const CODE_RE = /(?:^|[^A-Z]|OPCHUB)TV[\s-]?(\d{6})(?!\d)/g;

export function extractMemberCode(content: string): string | null {
  const text = content.toUpperCase();
  const codes = new Set<string>();
  for (const m of text.matchAll(CODE_RE)) {
    if (m[1]) codes.add(`TV${m[1]}`);
  }
  // Nhiều mã khác nhau → mơ hồ, để Admin xử lý tay
  return codes.size === 1 ? ([...codes][0] ?? null) : null;
}

/** V4-610: mã CK Gói Gọi vốn `GV` + 6 số — cùng luật dính liền / khoảng trắng như Mã TV */
const FUNDRAISING_RE = /(?:^|[^A-Z]|OPCHUB)GV[\s-]?(\d{6})(?!\d)/g;

export type PaymentCode =
  | { kind: 'member'; code: string }
  | { kind: 'fundraising'; code: string; memberCode: string | null };

function codesOf(text: string, re: RegExp, prefix: string): Set<string> {
  const codes = new Set<string>();
  for (const m of text.matchAll(re)) if (m[1]) codes.add(`${prefix}${m[1]}`);
  return codes;
}

/**
 * Đối soát theo tiền tố (blueprint §4 "reconcile dispatch theo prefix"). D-105 (B3): mẫu §28.1
 * `OPCHUB TVxxxxxx 0xxx GVxxxxxx` có cả TV và GV → ưu tiên GV, trả kèm Mã TV để kiểm đúng chủ khoản.
 * Nhiều mã cùng loại → mơ hồ (`null`, Admin xử lý tay).
 */
export function extractPaymentCode(content: string): PaymentCode | null {
  const text = content.toUpperCase();
  const tv = [...codesOf(text, CODE_RE, 'TV')];
  const gv = [...codesOf(text, FUNDRAISING_RE, 'GV')];
  if (tv.length > 1 || gv.length > 1) return null;
  const [member] = tv;
  const [fund] = gv;
  if (fund) return { kind: 'fundraising', code: fund, memberCode: member ?? null };
  return member ? { kind: 'member', code: member } : null;
}
