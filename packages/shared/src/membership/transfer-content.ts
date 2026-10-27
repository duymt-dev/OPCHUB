/**
 * §28.1 BR-PAY-REF (D-104, D-105): nội dung chuyển khoản thống nhất —
 * phí thành viên `OPCHUB [Mã TV] [SĐT]`, Gói Gọi vốn `OPCHUB [Mã TV] [SĐT] GV[mã]`.
 * SĐT chuẩn hoá 10 số bắt đầu bằng 0 (`+84…` / `84…` → `0…`); chưa có SĐT thì bỏ token.
 */
export function localPhone(phone: string | null | undefined): string {
  const d = (phone ?? '').replace(/\D/g, '');
  if (!d) return '';
  return (d.startsWith('84') ? `0${d.slice(2)}` : d).slice(-10);
}

export const transferContentOf = (
  memberCode: string,
  phone: string | null | undefined,
  fundraisingCode?: string | null,
): string =>
  ['OPCHUB', memberCode, localPhone(phone), fundraisingCode ?? ''].filter(Boolean).join(' ');
