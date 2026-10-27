/**
 * GỢI Ý cho kế toán (BUG-014) — KHÔNG dùng để tự khớp (D-104 dùng `parsePaymentContent`).
 * Nội dung CK do người dùng gõ nên rất bẩn:
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

/** Gợi ý mã CK Gói Gọi vốn `GV` + 6 số cho kế toán — cùng luật dễ dãi như Mã TV */
const FUNDRAISING_RE = /(?:^|[^A-Z]|OPCHUB)GV[\s-]?(\d{6})(?!\d)/g;

function codesOf(text: string, re: RegExp, prefix: string): Set<string> {
  const codes = new Set<string>();
  for (const m of text.matchAll(re)) if (m[1]) codes.add(`${prefix}${m[1]}`);
  return codes;
}

/** Gợi ý mã GV đọc được trong nội dung (hàng "Cần đối soát") */
export function extractFundraisingCode(content: string): string | null {
  const gv = [...codesOf(content.toUpperCase(), FUNDRAISING_RE, 'GV')];
  return gv.length === 1 ? (gv[0] ?? null) : null;
}

const TV_TOKEN = /^TV\d{6}$/;
const GV_TOKEN = /^GV\d{6}$/;
const PHONE_TOKEN = /^0\d{9}$/;

export type ParsedContent =
  | { kind: 'member'; code: string }
  | { kind: 'fundraising'; code: string; memberCode: string }
  | { kind: 'invalid'; reason: string };

/**
 * D-104 / D-105 (§28.1 BR-PAY-REF): tự khớp CHỈ khi nội dung đúng mẫu
 * `OPCHUB [Mã TV] [SĐT?] [GVxxxxxx?]` — tách theo khoảng trắng, không dấu chấm / gạch dính token.
 * Ngân hàng có thể chèn mã giao dịch phía trước (`MBVCB.123 OPCHUB …`) → tìm token `OPCHUB` đứng
 * riêng (Q-V42-704-1). Sau Mã TV chỉ cho SĐT 10 số và / hoặc một mã GV; thừa / sai → đối soát tay.
 */
export function parsePaymentContent(content: string): ParsedContent {
  const tokens = content.toUpperCase().trim().split(/\s+/).filter(Boolean);
  const at = tokens.indexOf('OPCHUB');
  if (at < 0) return { kind: 'invalid', reason: 'Nội dung không bắt đầu bằng OPCHUB' };
  const [tv, ...rest] = tokens.slice(at + 1);
  if (!tv || !TV_TOKEN.test(tv)) {
    return { kind: 'invalid', reason: 'Không tìm thấy Mã TV trong nội dung' };
  }
  const tail = PHONE_TOKEN.test(rest[0] ?? '') ? rest.slice(1) : rest;
  if (tail.length === 0) return { kind: 'member', code: tv };
  const [gv, ...extra] = tail;
  if (gv && GV_TOKEN.test(gv) && extra.length === 0) {
    return { kind: 'fundraising', code: gv, memberCode: tv };
  }
  return { kind: 'invalid', reason: 'Nội dung không đúng mẫu OPCHUB [Mã TV] [SĐT] [GV]' };
}
