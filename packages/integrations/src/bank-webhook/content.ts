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
